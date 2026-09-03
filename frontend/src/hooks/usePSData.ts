import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ProblemStatement } from '../types';
import { api } from '../services/api';

export function usePSData(psId: string) {
  const [data, setData] = useState<ProblemStatement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [prevCount, setPrevCount] = useState<number | null>(null);

  useEffect(() => {
    if (!psId) return;
    const targetId = psId.toUpperCase();
    
    setLoading(true);
    setError(null);
    setIsInitializing(false);
    
    // Notify backend to track this PS ID if not already tracked
    api.trackPS(targetId).catch(() => {});

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    
    const formatDoc = (rawData: any): ProblemStatement => {
      return {
        psId: rawData.psId || rawData.ps_id || targetId,
        title: rawData.title || '',
        description: rawData.description || '',
        category: rawData.category || 'General',
        theme: rawData.theme || 'General',
        count: typeof rawData.count === 'number' ? rawData.count : 0,
        capacity: typeof rawData.capacity === 'number' ? rawData.capacity : 500,
        remaining: typeof rawData.remaining === 'number' ? rawData.remaining : 500,
        percentage: typeof rawData.percentage === 'number' ? rawData.percentage : 0,
        raw: rawData.raw || `${rawData.count || 0}/${rawData.capacity || 500}`,
        status: rawData.status || 'live',
        firstSeenAt: rawData.firstSeenAt || null,
        lastUpdatedAt: rawData.lastUpdatedAt || null,
        lastCountChangeAt: rawData.lastCountChangeAt || null,
        lastSuccessfulFetchAt: rawData.lastSuccessfulFetchAt || null,
        source: rawData.source || 'SIH 2026 Portal',
      };
    };

    const unsubscribe = onSnapshot(
      doc(db, 'problemStatements', targetId),
      (docSnap) => {
        if (docSnap.exists()) {
          const formatted = formatDoc(docSnap.data());
          setData((current) => {
            if (current && current.count !== formatted.count) {
              setPrevCount(current.count);
            }
            return formatted;
          });
          setError(null);
          setIsInitializing(false);
          setLoading(false);
          if (pollInterval) clearInterval(pollInterval);
        } else {
          // If Firestore doc isn't in client cache or initialized yet, fallback to REST API
          api.getPS(targetId)
            .then((resData) => {
              const formatted = formatDoc(resData);
              setData(formatted);
              setError(null);
              setIsInitializing(false);
              setLoading(false);
              if (pollInterval) clearInterval(pollInterval);
            })
            .catch(() => {
              // Not yet in Firestore — mark as initializing & start background polling
              setIsInitializing(true);
              setLoading(false);
              
              if (!pollInterval) {
                pollInterval = setInterval(() => {
                  api.getPS(targetId)
                    .then((resData) => {
                      const formatted = formatDoc(resData);
                      setData(formatted);
                      setError(null);
                      setIsInitializing(false);
                      setLoading(false);
                      if (pollInterval) clearInterval(pollInterval);
                    })
                    .catch(() => {
                      // Still waiting for background collector cycle
                    });
                }, 3000);
              }
            });
        }
      },
      (err) => {
        console.warn('Firestore onSnapshot error, falling back to REST API:', err);
        // Fallback to REST API on Firestore connection error
        api.getPS(targetId)
          .then((resData) => {
            const formatted = formatDoc(resData);
            setData(formatted);
            setError(null);
            setIsInitializing(false);
          })
          .catch(() => {
            setError('Error loading problem statement data.');
          })
          .finally(() => {
            setLoading(false);
          });
      }
    );

    return () => {
      unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [psId]);

  return { data, loading, isInitializing, error, prevCount };
}
