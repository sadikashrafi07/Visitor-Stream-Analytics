import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartContainer,
  EmptyState,
  LoadingState,
  ErrorState,
} from './ChartContainer';
import { useVisitors, useSessions } from '@/hooks/useAnalyticsData';

type ChartRow = {
  name: string;
  value: number;
};

type VisitorRow = {
  visitor_id: string;
  first_visit_at: string | null;
  last_visit_at: string | null;
  total_sessions: number | null;
};

type SessionRow = {
  session_id: string;
  visitor_id: string;
  session_start: string | null;
  session_end: string | null;
};

type VisitorSessionTimeline = {
  visitor_id: string;
  first_visit_at: string | null;
  last_visit_at: string | null;
  actual_sessions: number;
  repeat_visits: number;
  first_return_gap_days: number | null;
};

function toValidTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function getDayDifferenceFromMs(startMs: number, endMs: number): number {
  const diffMs = Math.max(0, endMs - startMs);
  return diffMs / (1000 * 60 * 60 * 24);
}

/**
 * Build a canonical ordered list of session start timestamps for one visitor.
 * We deduplicate primarily by session_id and secondarily by exact start timestamp,
 * so noisy duplicate rows do not inflate returning/frequent counts.
 */
function uniqueSortedSessionStarts(sessions: SessionRow[]): number[] {
  const seenSessionIds = new Set<string>();
  const seenStartTimestamps = new Set<number>();
  const starts: number[] = [];

  for (const session of sessions) {
    const sessionId =
      typeof session?.session_id === 'string' ? session.session_id.trim() : '';
    if (!sessionId) continue;
    if (seenSessionIds.has(sessionId)) continue;
    seenSessionIds.add(sessionId);

    const startMs = toValidTime(session.session_start);
    if (startMs === null) continue;

    if (seenStartTimestamps.has(startMs)) continue;
    seenStartTimestamps.add(startMs);

    starts.push(startMs);
  }

  starts.sort((a, b) => a - b);
  return starts;
}

export function ReturningVisitorAnalytics() {
  const {
    data: visitors,
    loading: visitorsLoading,
    error: visitorsError,
  } = useVisitors(false, true);

  const {
    data: sessions,
    loading: sessionsLoading,
    error: sessionsError,
  } = useSessions(false, true);

  const derived = useMemo(() => {
    const safeVisitors = Array.isArray(visitors) ? (visitors as VisitorRow[]) : [];
    const safeSessions = Array.isArray(sessions) ? (sessions as SessionRow[]) : [];

    const visitorById = new Map<string, VisitorRow>();
    const sessionsByVisitor = new Map<string, SessionRow[]>();

    for (const visitor of safeVisitors) {
      const visitorId =
        typeof visitor?.visitor_id === 'string' ? visitor.visitor_id.trim() : '';
      if (!visitorId) continue;
      visitorById.set(visitorId, visitor);
    }

    for (const session of safeSessions) {
      const visitorId =
        typeof session?.visitor_id === 'string' ? session.visitor_id.trim() : '';
      const sessionId =
        typeof session?.session_id === 'string' ? session.session_id.trim() : '';

      if (!visitorId || !sessionId) continue;

      const existing = sessionsByVisitor.get(visitorId) ?? [];
      existing.push(session);
      sessionsByVisitor.set(visitorId, existing);
    }

    const visitorIds = new Set<string>([
      ...Array.from(visitorById.keys()),
      ...Array.from(sessionsByVisitor.keys()),
    ]);

    const visitorStats: VisitorSessionTimeline[] = Array.from(visitorIds)
      .map((visitorId) => {
        const visitor = visitorById.get(visitorId);
        const visitorSessions = sessionsByVisitor.get(visitorId) ?? [];
        const sortedStarts = uniqueSortedSessionStarts(visitorSessions);

        /**
         * Canonical source of truth for returning/frequent users:
         * actual grouped sessions from the sessions table.
         *
         * We only fall back to visitor.total_sessions when there are zero
         * usable session rows for that visitor, because total_sessions is
         * an aggregate/cache field and can drift.
         */
        const derivedSessionCount = sortedStarts.length;

        const storedSessionCount =
          typeof visitor?.total_sessions === 'number' &&
          Number.isFinite(visitor.total_sessions)
            ? Math.max(0, Math.floor(visitor.total_sessions))
            : 0;

        const actualSessions =
          derivedSessionCount > 0 ? derivedSessionCount : storedSessionCount;

        if (actualSessions <= 0) return null;

        const firstVisitAt = visitor?.first_visit_at ?? null;
        const lastVisitAt = visitor?.last_visit_at ?? null;

        let firstReturnGapDays: number | null = null;

        if (sortedStarts.length >= 2) {
          firstReturnGapDays = getDayDifferenceFromMs(sortedStarts[0], sortedStarts[1]);
        } else {
          const firstVisitMs = toValidTime(firstVisitAt);
          const lastVisitMs = toValidTime(lastVisitAt);

          /**
           * Fallback only when:
           * - aggregate says there were multiple sessions
           * - but we do not have enough usable session-start rows
           */
          if (
            actualSessions > 1 &&
            sortedStarts.length < 2 &&
            firstVisitMs !== null &&
            lastVisitMs !== null &&
            lastVisitMs >= firstVisitMs
          ) {
            firstReturnGapDays = getDayDifferenceFromMs(firstVisitMs, lastVisitMs);
          }
        }

        return {
          visitor_id: visitorId,
          first_visit_at: firstVisitAt,
          last_visit_at: lastVisitAt,
          actual_sessions: actualSessions,
          repeat_visits: Math.max(0, actualSessions - 1),
          first_return_gap_days: firstReturnGapDays,
        };
      })
      .filter((row): row is VisitorSessionTimeline => Boolean(row));

    const returning = visitorStats.filter((visitor) => visitor.actual_sessions > 1);
    const frequent = visitorStats.filter((visitor) => visitor.actual_sessions >= 3);

    const revisitBucketCounts: Record<string, number> = {
      'Same Day': 0,
      'Within 7 Days': 0,
      'Within 30 Days': 0,
      '30+ Days': 0,
    };

    const sessionCountMap: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5+': 0,
    };

    let totalFirstReturnGapDays = 0;
    let returningWithKnownGapCount = 0;
    let totalRepeatVisits = 0;

    for (const visitor of visitorStats) {
      const bucketKey =
        visitor.actual_sessions >= 5 ? '5+' : String(visitor.actual_sessions);

      sessionCountMap[bucketKey] = (sessionCountMap[bucketKey] ?? 0) + 1;
      totalRepeatVisits += visitor.repeat_visits;
    }

    for (const visitor of returning) {
      const days = visitor.first_return_gap_days;

      if (days === null) continue;

      totalFirstReturnGapDays += days;
      returningWithKnownGapCount += 1;

      if (days < 1) revisitBucketCounts['Same Day'] += 1;
      else if (days < 7) revisitBucketCounts['Within 7 Days'] += 1;
      else if (days < 30) revisitBucketCounts['Within 30 Days'] += 1;
      else revisitBucketCounts['30+ Days'] += 1;
    }

    const revisitBuckets: ChartRow[] = Object.entries(revisitBucketCounts).map(
      ([name, value]) => ({
        name,
        value,
      })
    );

    const sessionCountDistribution: ChartRow[] = ['1', '2', '3', '4', '5+']
      .filter((key) => (sessionCountMap[key] ?? 0) > 0)
      .map((key) => ({
        name:
          key === '1'
            ? '1 session'
            : key === '5+'
              ? '5+ sessions'
              : `${key} sessions`,
        value: sessionCountMap[key],
      }));

    const averageReturnGapDays =
      returningWithKnownGapCount > 0
        ? totalFirstReturnGapDays / returningWithKnownGapCount
        : 0;

    return {
      allVisitorsWithSessions: visitorStats,
      returning,
      frequent,
      revisitBuckets,
      sessionCountDistribution,
      averageReturnGapDays,
      totalRepeatVisits,
      returningWithKnownGapCount,
    };
  }, [visitors, sessions]);

  const loading = visitorsLoading || sessionsLoading;
  const error = visitorsError || sessionsError || null;

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Returning Visitors
          </p>
          <p className="mt-1 text-3xl font-bold font-display">
            {derived.returning.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Came back for at least one additional session
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Frequent Visitors
          </p>
          <p className="mt-1 text-3xl font-bold font-display">
            {derived.frequent.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Visitors with 3 or more sessions
          </p>
        </div>

        <div className="col-span-2 kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Average Return Gap
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {derived.returningWithKnownGapCount > 0
              ? `${derived.averageReturnGapDays.toFixed(1)} days`
              : '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Average time between first visit and first return for returning visitors
          </p>
        </div>
      </div>

      <ChartContainer
        title="Revisit Time Gap"
        subtitle="How soon visitors return after their first visit"
      >
        {derived.returning.length === 0 ? (
          <EmptyState message="No returning visitors yet" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={derived.revisitBuckets}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [`${value} visitors`, 'Visitors']}
              />
              <Bar
                dataKey="value"
                fill="hsl(var(--chart-2))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer
        title="Session Count Distribution"
        subtitle="How many sessions each visitor has accumulated"
        className="lg:col-span-2"
      >
        {derived.sessionCountDistribution.length === 0 ? (
          <EmptyState message="No visitor session data available yet" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={derived.sessionCountDistribution}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [`${value} visitors`, 'Visitors']}
              />
              <Bar
                dataKey="value"
                fill="hsl(var(--chart-1))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    </div>
  );
}