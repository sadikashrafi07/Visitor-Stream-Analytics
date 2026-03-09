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
import { useVisitors } from '@/hooks/useAnalyticsData';

type ChartRow = {
  name: string;
  value: number;
};

function getDayDifference(start: string, end: string) {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;

  const diffMs = Math.max(0, endMs - startMs);
  return diffMs / (1000 * 60 * 60 * 24);
}

export function ReturningVisitorAnalytics() {
  const { data: visitors, loading, error } = useVisitors();

  const derived = useMemo(() => {
    const returning = visitors.filter((visitor) => visitor.total_sessions > 1);
    const frequent = visitors.filter((visitor) => visitor.total_sessions >= 3);

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

    let totalReturnGapDays = 0;

    for (const visitor of visitors) {
      const sessionBucket =
        visitor.total_sessions >= 5 ? '5+' : String(visitor.total_sessions);

      sessionCountMap[sessionBucket] =
        (sessionCountMap[sessionBucket] || 0) + 1;
    }

    for (const visitor of returning) {
      const days = getDayDifference(visitor.first_visit_at, visitor.last_visit_at);

      totalReturnGapDays += days;

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
      .filter((key) => sessionCountMap[key] > 0)
      .map((key) => ({
        name: key === '1' ? '1 session' : `${key} sessions`,
        value: sessionCountMap[key],
      }));

    const averageReturnGapDays =
      returning.length > 0 ? totalReturnGapDays / returning.length : 0;

    return {
      returning,
      frequent,
      revisitBuckets,
      sessionCountDistribution,
      averageReturnGapDays,
    };
  }, [visitors]);

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
            {derived.returning.length > 0
              ? `${derived.averageReturnGapDays.toFixed(1)} days`
              : '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Average time between first and latest recorded visit for returning visitors
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