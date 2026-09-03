import { ProblemStatement, HistoryEntry, CollectorStatus } from '../types';

const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export const api = {
  getPS: async (psId: string): Promise<ProblemStatement> => {
    const res = await fetch(`${BASE}/ps/${psId}`);
    if (!res.ok) throw new Error('Failed to fetch PS data');
    return res.json();
  },
  getHistory: async (psId: string): Promise<HistoryEntry[]> => {
    const res = await fetch(`${BASE}/ps/${psId}/history`);
    if (!res.ok) throw new Error('Failed to fetch history');
    const data = await res.json();
    return Array.isArray(data) ? data : (data.history || []);
  },
  trackPS: async (psId: string): Promise<void> => {
    const res = await fetch(`${BASE}/ps/${psId}/track`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to track PS');
  },
  getHealth: async (): Promise<CollectorStatus> => {
    const res = await fetch(`${BASE}/health`);
    if (!res.ok) throw new Error('Failed to fetch health');
    return res.json();
  },
};
