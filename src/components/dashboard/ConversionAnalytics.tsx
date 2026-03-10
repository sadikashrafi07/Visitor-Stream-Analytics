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
  useEvents,
  useSessions,
} from '@/hooks/useAnalyticsData';
import {
  formatShortDate,
  formatPercent,
  formatNumber,
} from '@/lib/analytics-utils';

const RESUME_EVENT = 'resume_download';
const CONTACT_SUCCESS_EVENT = 'contact_submit_success';

type ConversionTrendRow = {
  date: string;
  resumeDownloads: number;
  contactSubmits: number;
  totalConversionActions: number;
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
    data: events,
    loading: eventsLoading,
    error: eventsError,
  } = useEvents();

  const {
    data: sessions,
    loading: sessionsLoading,
    error: sessionsError,
  } = useSessions();

  const derived = useMemo(() => {
    const resumeEvents = events.filter(
      (event) => event.event_name === RESUME_EVENT
    );

    const contactSuccessEvents = events.filter(
      (event) => event.event_name === CONTACT_SUCCESS_EVENT
    );

    const convertedSessionIds = new Set<string>();

    for (const event of resumeEvents) {
      if (event.session_id) convertedSessionIds.add(event.session_id);
    }

    for (const event of contactSuccessEvents) {
      if (event.session_id) convertedSessionIds.add(event.session_id);
    }

    const resumeTotal = resumeEvents.length;
    const contactTotal = contactSuccessEvents.length;
    const totalConversionActions = resumeTotal + contactTotal;
    const conversionSessions = convertedSessionIds.size;
    const totalSessions = sessions.length;

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

    const trendData: ConversionTrendRow[] = metrics.map((metric) => {
      const resumeDownloads = toSafeNumber(metric.resume_downloads);
      const contactSubmits = toSafeNumber(metric.contact_submits);

      return {
        date: formatShortDate(metric.metric_date),
        resumeDownloads,
        contactSubmits,
        totalConversionActions: resumeDownloads + contactSubmits,
      };
    });

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
  }, [events, sessions, metrics]);

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
            Converted sessions / total sessions
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