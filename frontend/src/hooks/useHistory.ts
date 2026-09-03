import { useState, useEffect } from 'react';
import { HistoryEntry } from '../types';
import { api } from '../services/api';

export function useHistory(psId: string, range: string) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!psId) return;
    
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const data = await api.getHistory(psId);
        
        // Filter by range logic would ideally be backend-driven or done here.
        // For now, we simulate filtering on the frontend by filtering past hours.
        const now = new Date().getTime();
        let hours = 24; // Default to 24H for simplicity if not handled
        if (range === '1H') hours = 1;
        else if (range === '6H') hours = 6;
        else if (range === '12H') hours = 12;
        else if (range === '7D') hours = 24 * 7;
        
        const cutoff = now - hours * 3600 * 1000;
        const filtered = data.filter(d => new Date(d.timestamp).getTime() >= cutoff);
        
        setHistory(filtered);
        setError(null);
      } catch (err) {
        setError('Failed to fetch history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [psId, range]);

  return { history, loading, error };
}
