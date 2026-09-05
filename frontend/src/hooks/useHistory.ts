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
        let data = await api.getHistory(targetId);
        const now = Date.now();
        
        let hours = 24;
        if (range === '1H') hours = 1;
        else if (range === '6H') hours = 6;
        else if (range === '12H') hours = 12;
        else if (range === '7D') hours = 24 * 7;
        
        const cutoff = now - hours * 3600 * 1000;
        
        let normalized = data.map((d: any) => ({
          count: typeof d.count === 'number' ? d.count : 0,
          previousCount: typeof d.previousCount === 'number' ? d.previousCount : 0,
          timestamp: parseTimestamp(d.timestamp),
        }));

        // Fallback: if backend still returned empty (e.g. old deploy), synthesize
        // a baseline point from the current PS document so the graph has saved
        // data even when collector has only run once. The first point's timestamp
        // is the PS's last update time (which equals firstSeenAt initially).
        if (normalized.length === 0) {
          try {
            const ps = await api.getPS(targetId);
            const ts = parseTimestamp(ps.lastCountChangeAt || ps.firstSeenAt || ps.lastSuccessfulFetchAt || now);
            normalized = [{ count: ps.count ?? 0, previousCount: ps.count ?? 0, timestamp: ts }];
          } catch (_) {
            // no PS fallback available
          }
        }

        let filtered = normalized.filter(d => d.timestamp >= cutoff);

        // If all points are outside the selected range, keep the most recent
        // point so the graph is never empty — shows a flat line at the last
        // known count instead of "No count changes recorded yet".
        if (filtered.length === 0 && normalized.length > 0) {
          // For single-point baseline, synthesize a second point at 'now' so
          // AreaChart renders a visible flat line rather than a single dot.
          const last = normalized[normalized.length - 1];
          if (normalized.length === 1 && last.timestamp < cutoff) {
            filtered = [
              { ...last, timestamp: cutoff },
              { ...last, timestamp: now },
            ];
          } else {
            filtered = normalized.slice(-1);
          }
        }

        // Ensure at least 2 points for a visible line when backend only gave one
        // baseline entry inside range: duplicate it at 'now' to render flat line.
        if (filtered.length === 1) {
          const only = filtered[0];
          // If point is older than 5 min, add a current flat point
          if (now - only.timestamp > 5 * 60 * 1000) {
            filtered = [only, { ...only, timestamp: now }];
          }
        }

        // Sort ascending for chart
        filtered.sort((a, b) => a.timestamp - b.timestamp);

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
