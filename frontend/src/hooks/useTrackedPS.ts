import { useState, useEffect } from 'react';
import { TrackedPS } from '../types';

export function useTrackedPS() {
  const [tracked, setTracked] = useState<TrackedPS[]>(() => {
    const stored = localStorage.getItem('tracked_ps');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem('tracked_ps', JSON.stringify(tracked));
  }, [tracked]);

  const addPS = (psId: string) => {
    setTracked((prev) => {
      if (prev.some((p) => p.psId === psId)) return prev;
      return [...prev, { psId, addedAt: new Date().toISOString() }];
    });
  };

  const removePS = (psId: string) => {
    setTracked((prev) => prev.filter((p) => p.psId !== psId));
  };

  const isTracked = (psId: string) => {
    return tracked.some((p) => p.psId === psId);
  };

  return { tracked, addPS, removePS, isTracked };
}
