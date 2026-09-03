export interface ProblemStatement {
  psId: string;
  title: string;
  description?: string;
  category: string;
  theme: string;
  count: number;
  capacity: number;
  remaining: number;
  percentage: number;
  raw: string;
  status: 'live' | 'stale' | 'error' | 'unknown';
  firstSeenAt: any;
  lastUpdatedAt: any;
  lastCountChangeAt: any;
  lastSuccessfulFetchAt: any;
  source: string;
}

export interface HistoryEntry {
  count: number;
  previousCount: number;
  timestamp: any;
}

export interface CollectorStatus {
  status: 'running' | 'error' | 'idle';
  lastRunAt: any;
  lastError: string | null;
}

export interface TrackedPS {
  psId: string;
  addedAt: string;
}
