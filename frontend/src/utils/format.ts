import { formatDistanceToNow, parseISO } from 'date-fns';

export function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'unknown time';
  try {
    return formatDistanceToNow(parseISO(isoString), { addSuffix: true });
  } catch (e) {
    return 'invalid time';
  }
}

export function formatPercentage(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

export function formatCount(count: number, capacity: number): string {
  return `${count} / ${capacity}`;
}

export function isDataStale(lastFetchAt: string | null, intervalSeconds: number = 60): boolean {
  if (!lastFetchAt) return true;
  const lastFetch = new Date(lastFetchAt).getTime();
  const now = new Date().getTime();
  return (now - lastFetch) > (intervalSeconds * 3 * 1000);
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
