import { formatDistanceToNow, parseISO } from 'date-fns';

export function parseTimestamp(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    return val < 1e11 ? new Date(val * 1000) : new Date(val);
  }
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') return val.toDate();
    if (typeof val.seconds === 'number') return new Date(val.seconds * 1000);
    if (typeof val._seconds === 'number') return new Date(val._seconds * 1000);
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
    try {
      const parsedIso = parseISO(val);
      if (!isNaN(parsedIso.getTime())) return parsedIso;
    } catch {}
  }
  return null;
}

export function formatRelativeTime(val: any): string {
  if (!val) return 'Just now';
  const date = parseTimestamp(val);
  if (!date) return 'Just now';
  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (e) {
    return 'Just now';
  }
}

export function formatPercentage(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

export function formatCount(count: number, capacity: number): string {
  return `${count} / ${capacity}`;
}

export function isDataStale(lastFetchAt: any, intervalSeconds: number = 60): boolean {
  if (!lastFetchAt) return true;
  const date = parseTimestamp(lastFetchAt);
  if (!date) return true;
  const now = Date.now();
  return (now - date.getTime()) > (intervalSeconds * 3 * 1000);
}

export function getStatusColor(percentage: number): string {
  if (percentage < 60) return '#10b981'; // success (green)
  if (percentage <= 85) return '#f59e0b'; // warning (yellow)
  return '#ef4444'; // danger (red)
}

export function validatePsId(id: string): boolean {
  return /^SIH26\d{3}$/i.test(id);
}

export function normalizePsId(id: string): string {
  return id.trim().toUpperCase();
}
