/** Safely parse JSON-like values from database fields */
export function safeParseJSON<T = Record<string, unknown>>(
  value: unknown,
  fallback: T = {} as T
): T {
  if (value == null) return fallback;

  // Already parsed object/array from Supabase JSON/JSONB
  if (typeof value === 'object') {
    return value as T;
  }

  // Only strings should be trimmed / JSON.parsed
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === '{}' || trimmed === '[]') return fallback;

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Format seconds into a human-readable duration */
export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, toFiniteNumber(seconds, 0));

  if (safeSeconds < 60) {
    return `${Math.round(safeSeconds)}s`;
  }

  if (safeSeconds < 3600) {
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = Math.round(safeSeconds % 60);
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.round((safeSeconds % 3600) / 60);

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/** Format large numbers with compact K/M suffixes */
export function formatNumber(value: number): string {
  const n = toFiniteNumber(value, 0);

  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;

  return Math.round(n).toString();
}

/** Format percentage */
export function formatPercent(value: number): string {
  const n = toFiniteNumber(value, 0);
  return `${n.toFixed(1)}%`;
}

/** Pretty-print event names */
export function formatEventName(name: string): string {
  if (!name) return 'Unknown Event';

  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Pretty-print section names */
export function formatSectionName(name: string): string {
  if (!name) return 'Unknown';

  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Get chart color by index */
export function getChartColor(index: number): string {
  const colors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--chart-6))',
  ];

  const safeIndex = Math.abs(Math.floor(toFiniteNumber(index, 0)));
  return colors[safeIndex % colors.length];
}

/** Aggregate numeric JSON object fields across multiple JSON-like values */
export function aggregateJsonCounts(records: unknown[]): Record<string, number> {
  const result: Record<string, number> = {};

  for (const raw of records) {
    const parsed = safeParseJSON<Record<string, unknown>>(raw, {});

    for (const [key, value] of Object.entries(parsed)) {
      const numericValue = toFiniteNumber(value, 0);
      result[key] = (result[key] || 0) + numericValue;
    }
  }

  return result;
}

/** Sort object entries by value descending */
export function sortedEntries(obj: Record<string, number>): [string, number][] {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

/** Relative time string */
export function timeAgo(dateStr: string): string {
  const timestamp = new Date(dateStr).getTime();

  if (!Number.isFinite(timestamp)) {
    return 'Unknown time';
  }

  const diffMs = Date.now() - timestamp;

  if (diffMs < 0) {
    return 'just now';
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/** Format full date for display */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);

  if (!Number.isFinite(date.getTime())) {
    return 'Invalid date';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format short date for compact chart labels */
export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);

  if (!Number.isFinite(date.getTime())) {
    return 'Invalid date';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}