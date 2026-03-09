/** Safely parse JSON strings from database fields */
export function safeParseJSON<T = Record<string, unknown>>(value: string | null | undefined, fallback: T = {} as T): T {
  if (!value || value === '{}' || value === '[]') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Format seconds into human-readable duration */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Format large numbers with K/M suffixes */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

/** Format percentage */
export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

/** Pretty-print event names */
export function formatEventName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Pretty-print section names */
export function formatSectionName(name: string): string {
  if (!name) return 'Unknown';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Get color for chart index */
export function getChartColor(index: number): string {
  const colors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--chart-6))',
  ];
  return colors[index % colors.length];
}

/** Aggregate JSON object fields across records */
export function aggregateJsonCounts(records: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const raw of records) {
    const parsed = safeParseJSON<Record<string, number>>(raw, {});
    for (const [key, val] of Object.entries(parsed)) {
      result[key] = (result[key] || 0) + (typeof val === 'number' ? val : 0);
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
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/** Format date for display */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
