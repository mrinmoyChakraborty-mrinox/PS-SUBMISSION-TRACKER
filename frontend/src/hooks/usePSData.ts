import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ProblemStatement } from '../types';
import { api } from '../services/api';

export function usePSData(psId: string) {
  const [data, setData] = useState<ProblemStatement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [prevCount, setPrevCount] = useState<number | null>(null);

  useEffect(() => {
    if (!psId) return;
    setLoading(true);
    
    // Attempt to track first, to make sure backend is aware
    api.trackPS(psId).catch(() => {});
    
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
          setLoading(false);
        } else {
          // If Firestore doc isn't in client cache or initialized yet, fallback to REST API
          api.getPS(psId)
            .then((resData) => {
              setData(resData);
              setError(null);
            })
            .catch(() => {
              setError('Problem Statement details are still initializing from SIH portal. Please check back in 1 minute.');
            })
            .finally(() => {
              setLoading(false);
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
          })
          .catch(() => {
            setError('Error connecting to live updates.');
          })
          .finally(() => {
            setLoading(false);
          });
      }
    );

    return () => unsubscribe();
  }, [psId]);

  return { data, loading, error, prevCount };
}
