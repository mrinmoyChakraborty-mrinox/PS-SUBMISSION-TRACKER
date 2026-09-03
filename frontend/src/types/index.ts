export interface ProblemStatement {
  psId: string;
  title: string;
  category: string;
  theme: string;
  count: number;
  capacity: number;
  remaining: number;
  percentage: number;
  raw: string;
  status: 'live' | 'stale' | 'error' | 'unknown';
  firstSeenAt: string | null;
  lastUpdatedAt: string | null;
  lastCountChangeAt: string | null;
  lastSuccessfulFetchAt: string | null;
  source: string;
}

export interface HistoryEntry {
  count: number;
  previousCount: number;
  timestamp: string | number;
}

export interface CollectorStatus {
  status: 'running' | 'error' | 'idle';
  lastRunAt: string | null;
  lastError: string | null;
}

export interface TrackedPS {
  psId: string;
  addedAt: string;
}
