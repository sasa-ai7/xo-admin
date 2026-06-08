/**
 * Format a timestamp as a short relative string ("3m ago", "in 2h", "5d ago").
 * Accepts millisecond numbers, Firestore Timestamp-like objects (with toDate),
 * ISO strings, or Date instances. Returns "—" for anything unparseable.
 */
export function toMs(value: unknown): number | null {
  if (value == null) return null;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === 'object') {
    const v = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof v.toDate === 'function') {
      try {
        const d = v.toDate();
        return d instanceof Date && Number.isFinite(d.getTime()) ? d.getTime() : null;
      } catch {
        return null;
      }
    }
    if (typeof v.seconds === 'number') return v.seconds * 1000;
    if (typeof v._seconds === 'number') return v._seconds * 1000;
  }
  return null;
}

const UNITS: Array<[string, number]> = [
  ['y', 365 * 24 * 60 * 60 * 1000],
  ['mo', 30 * 24 * 60 * 60 * 1000],
  ['d', 24 * 60 * 60 * 1000],
  ['h', 60 * 60 * 1000],
  ['m', 60 * 1000],
  ['s', 1000],
];

export function formatRelativeTime(value: unknown, now: number = Date.now()): string {
  const ms = toMs(value);
  if (ms == null) return '—';
  const diff = ms - now;
  const absDiff = Math.abs(diff);
  if (absDiff < 15_000) return 'just now';
  for (const [label, unit] of UNITS) {
    if (absDiff >= unit) {
      const value = Math.round(absDiff / unit);
      return diff < 0 ? `${value}${label} ago` : `in ${value}${label}`;
    }
  }
  return 'just now';
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatAbsoluteTime(value: unknown): string {
  const ms = toMs(value);
  if (ms == null) return '—';
  try {
    return new Date(ms).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date(ms).toISOString();
  }
}
