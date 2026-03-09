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
import { useDailyMetrics, useEvents, useSessions } from '@/hooks/useAnalyticsData';
import { formatShortDate, formatPercent } from '@/lib/analytics-utils';

const RESUME_EVENT = 'resume_download';
const CONTACT_SUCCESS_EVENT = 'contact_submit_success';

export function ConversionAnalytics() {
  const {
    data: metrics,
    loading: metricsLoading,
    error: metricsError,
  } = useDailyMetrics();

  const {
    data: events,
    loading: eventsLoading,
    error: eventsError,
  } = useEvents();

  const {
    data: sessions,
    loading: sessionsLoading,
    error: sessionsError,
  } = useSessions();

  const trendData = useMemo(
    () =>
      metrics.map((m) => ({
        date: formatShortDate(m.metric_date),
        resumeDownloads: m.resume_downloads,
        contactSubmits: m.contact_submits,
        conversions: m.total_conversions,
      })),
    [metrics]
  );

  const conversionSummary = useMemo(() => {
    let resumeTotal = 0;
    let contactTotal = 0;

    const convertedSessionIds = new Set<string>();

    for (const event of events) {
      if (event.event_name === RESUME_EVENT) {
        resumeTotal += 1;
        if (event.session_id) convertedSessionIds.add(event.session_id);
      }

      if (event.event_name === CONTACT_SUCCESS_EVENT) {
        contactTotal += 1;
        if (event.session_id) convertedSessionIds.add(event.session_id);
      }
    }

    const conversionSessions = convertedSessionIds.size;
    const totalSessions = sessions.length;
    const conversionRate =
      totalSessions > 0 ? (conversionSessions / totalSessions) * 100 : 0;

    return {
      resumeTotal,
      contactTotal,
      conversionSessions,
      totalSessions,
      conversionRate,
    };
  }, [events, sessions]);

  const highIntentSummary = useMemo(() => {
    const latestMetric = metrics.length ? metrics[metrics.length - 1] : null;

    return {
      totalConversions: latestMetric?.total_conversions ?? 0,
      resumeConversions: latestMetric?.resume_conversions ?? 0,
      contactConversions: latestMetric?.contact_conversions ?? 0,
    };
  }, [metrics]);

  const isLoading = metricsLoading || eventsLoading || sessionsLoading;
  const error = metricsError || eventsError || sessionsError || null;

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
            {conversionSummary.resumeTotal}
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
            {conversionSummary.contactTotal}
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
            {conversionSummary.conversionSessions}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Unique sessions with resume or contact action
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Conversion Rate
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {formatPercent(conversionSummary.conversionRate)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Converted sessions / total sessions
          </p>
        </div>
      </div>

      <ChartContainer
        title="Conversions Over Time"
        subtitle="Daily resume downloads and contact submissions"
      >
        {trendData.length === 0 ? (
          <EmptyState message="No conversion trend data available yet" />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
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
                dataKey="resumeDownloads"
                stroke="hsl(var(--chart-3))"
                fill="hsl(var(--chart-3))"
                fillOpacity={0.15}
                strokeWidth={2}
                name="Resume Downloads"
              />
              <Area
                type="monotone"
                dataKey="contactSubmits"
                stroke="hsl(var(--chart-1))"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.15}
                strokeWidth={2}
                name="Contact Submits"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer
        title="Strongest Hiring-Intent Signals"
        subtitle="Actions that indicate stronger recruiter interest"
        className="lg:col-span-2"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-success/5 p-4">
            <p className="text-sm font-medium text-success">
              📄 Resume Download
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Downloading the resume usually indicates serious evaluation and
              shortlisting intent.
            </p>
            <p className="mt-3 text-lg font-semibold text-foreground">
              {highIntentSummary.resumeConversions}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-primary/5 p-4">
            <p className="text-sm font-medium text-primary">
              ✉️ Contact Form Submit
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Contact submission is the clearest direct-interest signal from a
              recruiter or hiring team.
            </p>
            <p className="mt-3 text-lg font-semibold text-foreground">
              {highIntentSummary.contactConversions}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-warning/5 p-4">
            <p className="text-sm font-medium text-warning">
              🔍 Total Conversion Actions
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Combined conversion actions show how often visitors move beyond
              passive browsing into intent-driven behavior.
            </p>
            <p className="mt-3 text-lg font-semibold text-foreground">
              {highIntentSummary.totalConversions}
            </p>
          </div>
        </div>
      </ChartContainer>
    </div>
  );
}