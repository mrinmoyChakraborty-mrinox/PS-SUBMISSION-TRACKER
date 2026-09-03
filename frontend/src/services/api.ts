import { ProblemStatement, HistoryEntry, CollectorStatus } from '../types';

const BASE = '/api';

export const api = {
  getPS: async (psId: string): Promise<ProblemStatement> => {
    const res = await fetch(`${BASE}/ps/${psId}`);
    if (!res.ok) throw new Error('Failed to fetch PS data');
    return res.json();
  },
  getHistory: async (psId: string): Promise<HistoryEntry[]> => {
    const res = await fetch(`${BASE}/ps/${psId}/history`);
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
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
