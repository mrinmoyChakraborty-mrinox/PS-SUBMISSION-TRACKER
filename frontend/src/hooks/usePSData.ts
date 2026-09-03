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
        } else {
          setError('Problem Statement not found or not tracked yet.');
        }
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError('Error connecting to live updates.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [psId]);

  return { data, loading, error, prevCount };
}
