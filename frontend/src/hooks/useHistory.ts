import { useState, useEffect } from 'react';
import { HistoryEntry } from '../types';
import { api } from '../services/api';

export function useHistory(psId: string, range: string) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!psId) return;
    const targetId = psId.toUpperCase();
    
    const parseTimestamp = (ts: any): number => {
      if (!ts) return Date.now();
      if (typeof ts === 'number') return ts;
      if (typeof ts === 'string') {
        const parsed = new Date(ts).getTime();
        return isNaN(parsed) ? Date.now() : parsed;
      }
      if (ts.seconds) return ts.seconds * 1000;
      if (ts._seconds) return ts._seconds * 1000;
      return Date.now();
    };

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const data = await api.getHistory(targetId);
        const now = Date.now();
        
        let hours = 24;
        if (range === '1H') hours = 1;
        else if (range === '6H') hours = 6;
        else if (range === '12H') hours = 12;
        else if (range === '7D') hours = 24 * 7;
        
        const cutoff = now - hours * 3600 * 1000;
        
        const normalized = data.map((d: any) => ({
          count: typeof d.count === 'number' ? d.count : 0,
          previousCount: typeof d.previousCount === 'number' ? d.previousCount : 0,
          timestamp: parseTimestamp(d.timestamp),
        }));

        const filtered = normalized.filter(d => d.timestamp >= cutoff);
        setHistory(filtered);
        setError(null);
      } catch (err) {
        console.warn('History fetch error:', err);
        setError('No history records logged yet');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [psId, range]);

  return { history, loading, error };
}
