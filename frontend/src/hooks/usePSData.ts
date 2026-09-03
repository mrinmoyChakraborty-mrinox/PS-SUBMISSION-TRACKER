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
    setLoading(true);
    setError(null);
    setIsInitializing(false);
    
    // Attempt to track first, to make sure backend is aware
    api.trackPS(psId).catch(() => {});

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    
    const unsubscribe = onSnapshot(
      doc(db, 'problemStatements', psId),
      (docSnap) => {
        if (docSnap.exists()) {
          const newData = docSnap.data() as ProblemStatement;
          setData((current) => {
            if (current && current.count !== newData.count) {
              setPrevCount(current.count);
            }
            return newData;
          });
          setError(null);
          setIsInitializing(false);
          setLoading(false);
          if (pollInterval) clearInterval(pollInterval);
        } else {
          // If Firestore doc isn't in client cache or initialized yet, fallback to REST API
          api.getPS(psId)
            .then((resData) => {
              setData(resData);
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
                  api.getPS(psId)
                    .then((resData) => {
                      setData(resData);
                      setError(null);
                      setIsInitializing(false);
                      if (pollInterval) clearInterval(pollInterval);
                    })
                    .catch(() => {
                      // Still waiting for background collector cycle
                    });
                }, 4000);
              }
            });
        }
      },
      (err) => {
        console.error(err);
        // Fallback to REST API on Firestore connection error
        api.getPS(psId)
          .then((resData) => {
            setData(resData);
            setError(null);
            setIsInitializing(false);
            setLoading(false);
          })
          .catch(() => {
            setError('Error connecting to live updates.');
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
