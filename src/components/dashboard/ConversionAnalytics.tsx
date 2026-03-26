import { useMemo } from 'react';
import {
  AreaChart,
  Area,
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
import {
  useDailyMetrics,
  useSessions,
  useSessionAnalytics,
} from '@/hooks/useAnalyticsData';
import {
  formatShortDate,
  formatPercent,
  formatNumber,
} from '@/lib/analytics-utils';

type ConversionTrendRow = {
  date: string;
  resumeDownloads: number;
  contactSubmits: number;
  totalConversionActions: number;
  metricDate: string;
};

function toSafeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function ConversionAnalytics() {
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

  const derived = useMemo(() => {
    const resumeTotal = metrics.reduce(
      (sum, metric) => sum + toSafeNumber(metric.resume_downloads),
      0
    );

    const contactTotal = metrics.reduce(
      (sum, metric) => sum + toSafeNumber(metric.contact_submits),
      0
    );

    const totalConversionActions = resumeTotal + contactTotal;

    const endedSessions = sessions.filter((session) => Boolean(session.session_end));
    const endedSessionCount = endedSessions.length;

    const conversionSessionsFromSessionSummary =
      sessionAnalytics.length > 0
        ? sessionAnalytics.filter((row) => Boolean(row.has_conversion)).length
        : 0;

    const conversionSessionsFromMetrics = metrics.reduce(
      (sum, metric) => sum + toSafeNumber(metric.total_conversions),
      0
    );

    const totalSessionsFromSessionSummary =
      sessionAnalytics.length > 0 ? sessionAnalytics.length : 0;

    const totalSessionsFromMetrics = metrics.reduce(
      (sum, metric) => sum + toSafeNumber(metric.total_sessions),
      0
    );

    const totalSessions =
      totalSessionsFromSessionSummary > 0
        ? totalSessionsFromSessionSummary
        : totalSessionsFromMetrics > 0
          ? totalSessionsFromMetrics
          : endedSessionCount;

    const conversionSessions =
      conversionSessionsFromSessionSummary > 0
        ? conversionSessionsFromSessionSummary
        : conversionSessionsFromMetrics;

    const conversionRate =
      totalSessions > 0 ? (conversionSessions / totalSessions) * 100 : 0;

    const actionsPerConvertedSession =
      conversionSessions > 0
        ? totalConversionActions / conversionSessions
        : 0;

    const resumeShare =
      totalConversionActions > 0
        ? (resumeTotal / totalConversionActions) * 100
        : 0;

    const contactShare =
      totalConversionActions > 0
        ? (contactTotal / totalConversionActions) * 100
        : 0;

    const trendData: ConversionTrendRow[] = [...metrics]
      .map((metric) => {
        const resumeDownloads = toSafeNumber(metric.resume_downloads);
        const contactSubmits = toSafeNumber(metric.contact_submits);

        return {
          date: formatShortDate(metric.metric_date),
          metricDate: metric.metric_date,
          resumeDownloads,
          contactSubmits,
          totalConversionActions: resumeDownloads + contactSubmits,
        };
      })
      .sort((a, b) => a.metricDate.localeCompare(b.metricDate));

    return {
      resumeTotal,
      contactTotal,
      totalConversionActions,
      conversionSessions,
      totalSessions,
      conversionRate,
      actionsPerConvertedSession,
      resumeShare,
      contactShare,
      trendData,
    };
  }, [metrics, sessions, sessionAnalytics]);

  const isLoading = metricsLoading || sessionsLoading || sessionAnalyticsLoading;
  const error = metricsError || sessionsError || sessionAnalyticsError || null;

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Resume Downloads
          </p>
          <p className="mt-1 text-3xl font-bold font-display text-success">
            {formatNumber(derived.resumeTotal)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Strong hiring-intent signal
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Contact Submits
          </p>
          <p className="mt-1 text-3xl font-bold font-display text-primary">
            {formatNumber(derived.contactTotal)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Direct recruiter interest
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Sessions with Conversion
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {formatNumber(derived.conversionSessions)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Unique sessions containing at least one conversion action
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Conversion Rate
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {formatPercent(derived.conversionRate)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Converted sessions / total tracked sessions
          </p>
        </div>
      </div>

      <ChartContainer
        title="Conversions Over Time"
        subtitle="Daily resume downloads and contact submissions"
      >
        {derived.trendData.length === 0 ? (
          <EmptyState message="No conversion trend data available yet" />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={derived.trendData}>
              <defs>
                <linearGradient id="resumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--chart-3))"
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--chart-3))"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="contactGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--chart-1))"
                    stopOpacity={0.24}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--chart-1))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                allowDecimals={false}
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
                dataKey="resumeDownloads"
                stroke="hsl(var(--chart-3))"
                fill="url(#resumeGradient)"
                strokeWidth={2}
                name="Resume Downloads"
              />
              <Area
                type="monotone"
                dataKey="contactSubmits"
                stroke="hsl(var(--chart-1))"
                fill="url(#contactGradient)"
                strokeWidth={2}
                name="Contact Submits"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer
        title="Conversion Quality Insights"
        subtitle="How conversion behavior is distributed across recruiter-intent actions"
        className="lg:col-span-2"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-warning/5 p-4">
            <p className="text-sm font-medium text-warning">
              🔍 Total Conversion Actions
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Total intent actions recorded, including resume downloads and
              successful contact submissions.
            </p>
            <p className="mt-3 text-lg font-semibold text-foreground">
              {formatNumber(derived.totalConversionActions)}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-primary/5 p-4">
            <p className="text-sm font-medium text-primary">
              📈 Actions per Converted Session
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Average number of conversion actions inside sessions that actually
              converted.
            </p>
            <p className="mt-3 text-lg font-semibold text-foreground">
              {derived.actionsPerConvertedSession.toFixed(1)}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-success/5 p-4">
            <p className="text-sm font-medium text-success">
              ⚖️ Conversion Mix
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Distribution of conversion intent between resume download behavior
              and direct contact behavior.
            </p>
            <p className="mt-3 text-lg font-semibold text-foreground">
              Resume {formatPercent(derived.resumeShare)} · Contact{' '}
              {formatPercent(derived.contactShare)}
            </p>
          </div>
        </div>
      </ChartContainer>
    </div>
  );
}