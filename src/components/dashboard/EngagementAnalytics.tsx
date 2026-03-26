import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  ChartContainer,
  EmptyState,
  LoadingState,
  ErrorState,
} from './ChartContainer';
import {
  useDailyMetrics,
  useSessions,
  useSessionAnalytics,
} from '@/hooks/useAnalyticsData';
import {
  formatShortDate,
  formatDuration,
} from '@/lib/analytics-utils';

type SessionDerivedStats = {
  session_id: string;
  visitor_id: string;
  duration_seconds: number;
  is_bounce: boolean;
  max_scroll_depth: number;
  unique_sections_count: number;
  total_section_time_seconds: number;
  conversion_resume: boolean;
  conversion_contact: boolean;
  has_conversion: boolean;
  quality_score: number;
  quality_label: 'High Intent' | 'Engaged' | 'Passive';
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toSafeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeDurationSeconds(value: unknown) {
  return Math.max(0, Math.floor(toSafeNumber(value, 0)));
}

function isSessionFinalized(session: {
  session_end?: string | null;
}) {
  return Boolean(session.session_end);
}

function getQualityLabel(score: number): SessionDerivedStats['quality_label'] {
  if (score >= 65) return 'High Intent';
  if (score >= 25) return 'Engaged';
  return 'Passive';
}

export function EngagementAnalytics() {
  const {
    data: metrics,
    loading: metricsLoading,
    error: metricsError,
  } = useDailyMetrics();

  const {
    data: sessions,
    loading: sessionsLoading,
    error: sessionsError,
  } = useSessions(false, true);

  const {
    data: sessionAnalytics,
    loading: sessionAnalyticsLoading,
    error: sessionAnalyticsError,
  } = useSessionAnalytics(false, true);

  const trendData = useMemo(
    () =>
      [...metrics]
        .map((metric) => ({
          date: formatShortDate(metric.metric_date),
          metricDate: metric.metric_date,
          duration: toSafeNumber(metric.avg_session_duration, 0),
          bounceRate: toSafeNumber(metric.bounce_rate, 0) * 100,
          engagement: toSafeNumber(metric.avg_engagement_score, 0),
        }))
        .sort((a, b) => a.metricDate.localeCompare(b.metricDate)),
    [metrics]
  );

  const sessionMap = useMemo(() => {
    return new Map(
      sessions.map((session) => [session.session_id, session] as const)
    );
  }, [sessions]);

  const sessionDerivedStats = useMemo<SessionDerivedStats[]>(() => {
    return sessionAnalytics
      .map((summary) => {
        const session = sessionMap.get(summary.session_id);

        const durationSeconds = normalizeDurationSeconds(
          session?.duration_seconds ?? summary.duration_seconds
        );

        const isBounce = Boolean(session?.is_bounce);

        const maxScrollDepth = clamp(
          Math.floor(toSafeNumber(summary.max_scroll_depth, 0)),
          0,
          100
        );

        const uniqueSectionsCount = Math.max(
          0,
          Math.floor(toSafeNumber(summary.sections_count, 0))
        );

        const totalSectionTimeSeconds = Math.max(
          0,
          Math.floor(toSafeNumber(summary.total_section_time, 0))
        );

        const conversionResume = Boolean(summary.conversion_resume);
        const conversionContact = Boolean(summary.conversion_contact);
        const hasConversion = Boolean(summary.has_conversion);

        const qualityScore = clamp(
          Math.round(toSafeNumber(summary.engagement_score, 0)),
          0,
          100
        );

        return {
          session_id: summary.session_id,
          visitor_id: session?.visitor_id ?? summary.visitor_id,
          duration_seconds: durationSeconds,
          is_bounce: isBounce,
          max_scroll_depth: maxScrollDepth,
          unique_sections_count: uniqueSectionsCount,
          total_section_time_seconds: totalSectionTimeSeconds,
          conversion_resume: conversionResume,
          conversion_contact: conversionContact,
          has_conversion: hasConversion,
          quality_score: qualityScore,
          quality_label: getQualityLabel(qualityScore),
        };
      })
      .filter((row) => Boolean(row.session_id) && Boolean(row.visitor_id));
  }, [sessionAnalytics, sessionMap]);

  const finalizedSessionStats = useMemo(
    () =>
      sessionDerivedStats.filter((row) => {
        const session = sessionMap.get(row.session_id);
        return session ? isSessionFinalized(session) : false;
      }),
    [sessionDerivedStats, sessionMap]
  );

  const scrollDistribution = useMemo(() => {
    const buckets: Record<string, number> = {
      '0-25%': 0,
      '26-50%': 0,
      '51-75%': 0,
      '76-100%': 0,
    };

    for (const session of finalizedSessionStats) {
      const depth = clamp(session.max_scroll_depth, 0, 100);

      if (depth <= 25) buckets['0-25%'] += 1;
      else if (depth <= 50) buckets['26-50%'] += 1;
      else if (depth <= 75) buckets['51-75%'] += 1;
      else buckets['76-100%'] += 1;
    }

    return Object.entries(buckets).map(([name, value]) => ({
      name,
      value,
    }));
  }, [finalizedSessionStats]);

  const sessionQualityDistribution = useMemo(() => {
    const buckets: Record<SessionDerivedStats['quality_label'], number> = {
      'High Intent': 0,
      Engaged: 0,
      Passive: 0,
    };

    for (const session of finalizedSessionStats) {
      buckets[session.quality_label] += 1;
    }

    return [
      { name: 'High Intent', value: buckets['High Intent'] },
      { name: 'Engaged', value: buckets.Engaged },
      { name: 'Passive', value: buckets.Passive },
    ];
  }, [finalizedSessionStats]);

  const topSessions = useMemo(() => {
    return [...finalizedSessionStats]
      .sort((a, b) => {
        if (b.quality_score !== a.quality_score) {
          return b.quality_score - a.quality_score;
        }

        if (Number(b.has_conversion) !== Number(a.has_conversion)) {
          return Number(b.has_conversion) - Number(a.has_conversion);
        }

        if (b.total_section_time_seconds !== a.total_section_time_seconds) {
          return b.total_section_time_seconds - a.total_section_time_seconds;
        }

        if (b.max_scroll_depth !== a.max_scroll_depth) {
          return b.max_scroll_depth - a.max_scroll_depth;
        }

        if (b.unique_sections_count !== a.unique_sections_count) {
          return b.unique_sections_count - a.unique_sections_count;
        }

        return b.duration_seconds - a.duration_seconds;
      })
      .slice(0, 5);
  }, [finalizedSessionStats]);

  const isLoading =
    metricsLoading || sessionsLoading || sessionAnalyticsLoading;

  const error =
    metricsError || sessionsError || sessionAnalyticsError || null;

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartContainer
        title="Avg Session Duration Trend"
        subtitle="Average session duration over time"
        className="lg:col-span-2"
      >
        {trendData.length === 0 ? (
          <EmptyState message="No engagement trend data available yet" />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="gDur" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--chart-1))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--chart-1))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
              />
              <XAxis
                dataKey="date"
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
                formatter={(value: number) => formatDuration(value)}
              />
              <Area
                type="monotone"
                dataKey="duration"
                stroke="hsl(var(--chart-1))"
                fill="url(#gDur)"
                strokeWidth={2}
                name="Avg Duration"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer
        title="Engagement Score Trend"
        subtitle="Average engagement score by day"
      >
        {trendData.length === 0 ? (
          <EmptyState message="No engagement score trend available yet" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
              />
              <XAxis
                dataKey="date"
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
              />
              <Area
                type="monotone"
                dataKey="engagement"
                stroke="hsl(var(--chart-3))"
                fill="hsl(var(--chart-3))"
                fillOpacity={0.15}
                strokeWidth={2}
                name="Avg Engagement Score"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer
        title="Scroll Depth Distribution"
        subtitle="Maximum scroll depth reached per finalized session"
      >
        {scrollDistribution.every((x) => x.value === 0) ? (
          <EmptyState message="No scroll depth data available yet" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scrollDistribution}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
              />
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
        title="Session Quality Categories"
        subtitle="Classified using finalized sessions only"
      >
        {sessionQualityDistribution.every((x) => x.value === 0) ? (
          <EmptyState message="No session quality data available yet" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sessionQualityDistribution}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
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
              />
              <Bar
                dataKey="value"
                fill="hsl(var(--chart-4))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer
        title="Top Engaged Sessions"
        subtitle="Ranked by canonical session summary signals with finalized-session confidence"
        className="lg:col-span-2"
      >
        {topSessions.length === 0 ? (
          <EmptyState message="No finalized session data available yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 text-left font-medium">Visitor</th>
                  <th className="py-2 text-left font-medium">Duration</th>
                  <th className="py-2 text-left font-medium">Scroll</th>
                  <th className="py-2 text-left font-medium">Unique Sections</th>
                  <th className="py-2 text-left font-medium">Section Time</th>
                  <th className="py-2 text-left font-medium">Quality</th>
                  <th className="py-2 text-left font-medium">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {topSessions.map((session) => (
                  <tr
                    key={session.session_id}
                    className="border-b border-border/50"
                  >
                    <td className="py-2 font-mono text-xs text-muted-foreground">
                      {session.visitor_id.slice(0, 8)}…
                    </td>
                    <td className="py-2">
                      {formatDuration(session.duration_seconds)}
                    </td>
                    <td className="py-2">{session.max_scroll_depth}%</td>
                    <td className="py-2">{session.unique_sections_count}</td>
                    <td className="py-2">
                      {formatDuration(session.total_section_time_seconds)}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            session.quality_label === 'High Intent'
                              ? 'analytics-badge bg-success/10 text-success'
                              : session.quality_label === 'Engaged'
                              ? 'analytics-badge bg-primary/10 text-primary'
                              : 'analytics-badge bg-muted text-muted-foreground'
                          }
                        >
                          {session.quality_label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {session.quality_score}/100
                        </span>
                      </div>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        {session.conversion_resume && (
                          <span className="analytics-badge bg-success/10 text-success">
                            Resume
                          </span>
                        )}
                        {session.conversion_contact && (
                          <span className="analytics-badge bg-primary/10 text-primary">
                            Contact
                          </span>
                        )}
                        {!session.has_conversion && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartContainer>
    </div>
  );
}