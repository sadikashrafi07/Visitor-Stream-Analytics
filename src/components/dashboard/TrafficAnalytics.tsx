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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  ChartContainer,
  EmptyState,
  LoadingState,
  ErrorState,
} from './ChartContainer';
import {
  useDailyMetrics,
  useVisitors,
  useSessions,
} from '@/hooks/useAnalyticsData';
import {
  formatShortDate,
  getChartColor,
  sortedEntries,
  formatPercent,
  formatNumber,
} from '@/lib/analytics-utils';

type ChartRow = {
  name: string;
  value: number;
};

type DailyTrafficRow = {
  date: string;
  visitors: number;
  sessions: number;
  metricDate: string;
};

type VisitorRow = {
  visitor_id: string;
  country: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  first_utm_source: string | null;
  first_utm_medium: string | null;
  first_utm_campaign: string | null;
  first_utm_content: string | null;
  first_utm_term: string | null;
  total_sessions?: number | null;
};

type SessionRow = {
  session_id: string;
  visitor_id: string;
  session_end: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
};

function normalizeLabel(value: string | null | undefined, fallback: string) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function truncateLabel(value: string, max = 30) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function toTitleCase(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeCountryLabel(value: string | null | undefined) {
  const normalized = normalizeLabel(value, 'Unknown');
  return normalized === 'Unknown' ? normalized : normalized.toUpperCase();
}

function normalizeDeviceLabel(value: string | null | undefined) {
  const normalized = normalizeLabel(value, 'Unknown');
  return normalized === 'Unknown' ? normalized : toTitleCase(normalized);
}

function normalizeBrowserLabel(value: string | null | undefined) {
  const normalized = normalizeLabel(value, 'Unknown');
  return normalized === 'Unknown' ? normalized : toTitleCase(normalized);
}

function normalizeOsLabel(value: string | null | undefined) {
  const normalized = normalizeLabel(value, 'Unknown');
  return normalized === 'Unknown' ? normalized : toTitleCase(normalized);
}

function normalizeReferrerLabel(value: string | null | undefined) {
  const raw = normalizeLabel(value, 'Direct');
  if (raw === 'Direct') return raw;

  try {
    const normalizedUrl = raw.startsWith('http://') || raw.startsWith('https://')
      ? raw
      : `https://${raw}`;
    const host = new URL(normalizedUrl).hostname.replace(/^www\./i, '').toLowerCase();
    return host ? truncateLabel(host, 32) : 'Direct';
  } catch {
    return truncateLabel(raw.toLowerCase(), 32);
  }
}

function normalizeSourceLabel(value: string | null | undefined, fallback: string) {
  const normalized = normalizeLabel(value, fallback);
  return normalized === fallback ? fallback : toTitleCase(normalized.toLowerCase());
}

function normalizeMediumLabel(value: string | null | undefined, fallback: string) {
  const normalized = normalizeLabel(value, fallback);
  return normalized === fallback ? fallback : toTitleCase(normalized.toLowerCase());
}

function normalizeCampaignLabel(value: string | null | undefined, fallback: string) {
  const normalized = normalizeLabel(value, fallback);
  return normalized === fallback ? fallback : truncateLabel(normalized, 28);
}

function buildCountRows(
  values: Array<string | null | undefined>,
  formatter: (value: string | null | undefined) => string
): ChartRow[] {
  const counts: Record<string, number> = {};

  for (const value of values) {
    const normalized = formatter(value);
    counts[normalized] = (counts[normalized] || 0) + 1;
  }

  return sortedEntries(counts).map(([name, value]) => ({
    name,
    value,
  }));
}

function buildAcquisitionRows(
  values: Array<string | null | undefined>,
  formatter: (value: string | null | undefined, fallback: string) => string,
  fallback: string
): ChartRow[] {
  const counts: Record<string, number> = {};

  for (const value of values) {
    const normalized = formatter(value, fallback);
    counts[normalized] = (counts[normalized] || 0) + 1;
  }

  return sortedEntries(counts).map(([name, value]) => ({
    name,
    value,
  }));
}

function hasAnySessionUtm(session: SessionRow) {
  return Boolean(
    session.utm_source ||
      session.utm_medium ||
      session.utm_campaign ||
      session.utm_content ||
      session.utm_term
  );
}

function hasAnyVisitorFirstTouch(visitor: VisitorRow) {
  return Boolean(
    visitor.first_utm_source ||
      visitor.first_utm_medium ||
      visitor.first_utm_campaign ||
      visitor.first_utm_content ||
      visitor.first_utm_term
  );
}

function hasMeaningfulAttribution(data: ChartRow[], fallback: string) {
  return data.some((row) => row.name !== fallback);
}

function formatCountTooltipLabel(name: string) {
  return name === 'value' ? 'Count' : name;
}

export function TrafficAnalytics() {
  const {
    data: metrics,
    loading: metricsLoading,
    error: metricsError,
  } = useDailyMetrics();

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

  const sessionsByVisitorId = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const session of sessions) {
      if (!session.visitor_id) continue;
      grouped.set(session.visitor_id, (grouped.get(session.visitor_id) || 0) + 1);
    }

    return grouped;
  }, [sessions]);

  const activeVisitors = useMemo(() => {
    return visitors.filter(
      (visitor) =>
        Boolean(visitor.visitor_id) &&
        (sessionsByVisitorId.get(visitor.visitor_id) || 0) > 0
    );
  }, [visitors, sessionsByVisitorId]);

  const allTrackedSessions = useMemo(() => {
    return sessions.filter((session) => Boolean(session.session_id));
  }, [sessions]);

  const dailyData = useMemo<DailyTrafficRow[]>(() => {
    return [...metrics]
      .map((metric) => ({
        date: formatShortDate(metric.metric_date),
        visitors: Number(metric.total_visitors || 0),
        sessions: Number(metric.total_sessions || 0),
        metricDate: metric.metric_date,
      }))
      .sort((a, b) => a.metricDate.localeCompare(b.metricDate));
  }, [metrics]);

  const countryData = useMemo<ChartRow[]>(
    () =>
      buildCountRows(
        activeVisitors.map((visitor) => visitor.country),
        normalizeCountryLabel
      ),
    [activeVisitors]
  );

  const deviceData = useMemo<ChartRow[]>(
    () =>
      buildCountRows(
        activeVisitors.map((visitor) => visitor.device_type),
        normalizeDeviceLabel
      ),
    [activeVisitors]
  );

  const browserData = useMemo<ChartRow[]>(
    () =>
      buildCountRows(
        activeVisitors.map((visitor) => visitor.browser),
        normalizeBrowserLabel
      ),
    [activeVisitors]
  );

  const osData = useMemo<ChartRow[]>(
    () =>
      buildCountRows(
        activeVisitors.map((visitor) => visitor.os),
        normalizeOsLabel
      ),
    [activeVisitors]
  );

  const referrerData = useMemo<ChartRow[]>(
    () =>
      buildCountRows(
        activeVisitors.map((visitor) => visitor.referrer),
        normalizeReferrerLabel
      ),
    [activeVisitors]
  );

  const firstTouchSourceFallback = 'No First-Touch Source';
  const firstTouchMediumFallback = 'No First-Touch Medium';
  const firstTouchCampaignFallback = 'No First-Touch Campaign';
  const sessionSourceFallback = 'No Session Source';
  const sessionMediumFallback = 'No Session Medium';
  const sessionCampaignFallback = 'No Session Campaign';

  const firstTouchSourceData = useMemo<ChartRow[]>(
    () =>
      buildAcquisitionRows(
        activeVisitors.map((visitor) => visitor.first_utm_source),
        normalizeSourceLabel,
        firstTouchSourceFallback
      ),
    [activeVisitors]
  );

  const firstTouchMediumData = useMemo<ChartRow[]>(
    () =>
      buildAcquisitionRows(
        activeVisitors.map((visitor) => visitor.first_utm_medium),
        normalizeMediumLabel,
        firstTouchMediumFallback
      ),
    [activeVisitors]
  );

  const firstTouchCampaignData = useMemo<ChartRow[]>(
    () =>
      buildAcquisitionRows(
        activeVisitors.map((visitor) => visitor.first_utm_campaign),
        normalizeCampaignLabel,
        firstTouchCampaignFallback
      ),
    [activeVisitors]
  );

  const sessionSourceData = useMemo<ChartRow[]>(
    () =>
      buildAcquisitionRows(
        allTrackedSessions.map((session) => session.utm_source),
        normalizeSourceLabel,
        sessionSourceFallback
      ),
    [allTrackedSessions]
  );

  const sessionMediumData = useMemo<ChartRow[]>(
    () =>
      buildAcquisitionRows(
        allTrackedSessions.map((session) => session.utm_medium),
        normalizeMediumLabel,
        sessionMediumFallback
      ),
    [allTrackedSessions]
  );

  const sessionCampaignData = useMemo<ChartRow[]>(
    () =>
      buildAcquisitionRows(
        allTrackedSessions.map((session) => session.utm_campaign),
        normalizeCampaignLabel,
        sessionCampaignFallback
      ),
    [allTrackedSessions]
  );

  const attributionSummary = useMemo(() => {
    const totalVisitors = activeVisitors.length;
    const totalSessions = allTrackedSessions.length;

    const attributedVisitors = activeVisitors.filter(hasAnyVisitorFirstTouch).length;
    const taggedSessions = allTrackedSessions.filter(hasAnySessionUtm).length;

    const firstTouchSourceTop =
      firstTouchSourceData.find((row) => row.name !== firstTouchSourceFallback) ??
      null;

    const sessionSourceTop =
      sessionSourceData.find((row) => row.name !== sessionSourceFallback) ??
      null;

    return {
      totalVisitors,
      totalSessions,
      attributedVisitors,
      unattributedVisitors: Math.max(0, totalVisitors - attributedVisitors),
      taggedSessions,
      untaggedSessions: Math.max(0, totalSessions - taggedSessions),
      attributedVisitorRate:
        totalVisitors > 0 ? (attributedVisitors / totalVisitors) * 100 : 0,
      taggedSessionRate:
        totalSessions > 0 ? (taggedSessions / totalSessions) * 100 : 0,
      firstTouchSourceTop,
      sessionSourceTop,
    };
  }, [
    activeVisitors,
    allTrackedSessions,
    firstTouchSourceData,
    sessionSourceData,
  ]);

  const isLoading = metricsLoading || visitorsLoading || sessionsLoading;
  const error = metricsError || visitorsError || sessionsError || null;

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 lg:col-span-2">
        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Top First-Touch Source
          </p>
          <p className="mt-1 text-xl font-bold font-display text-primary">
            {attributionSummary.firstTouchSourceTop?.name ?? '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Original visitor acquisition source
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Top Session Source
          </p>
          <p className="mt-1 text-xl font-bold font-display text-primary">
            {attributionSummary.sessionSourceTop?.name ?? '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Source recorded across all tracked sessions
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Attributed Visitors
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {formatNumber(attributionSummary.attributedVisitors)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatPercent(attributionSummary.attributedVisitorRate)} of active visitors
            have first-touch UTM attribution
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Tagged Sessions
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {formatNumber(attributionSummary.taggedSessions)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatPercent(attributionSummary.taggedSessionRate)} of tracked sessions
            carry session-level UTM tags
          </p>
        </div>
      </div>

      <ChartContainer
        title="Visitors & Sessions by Day"
        subtitle="Daily traffic trend over time"
        className="lg:col-span-2"
      >
        {dailyData.length === 0 ? (
          <EmptyState message="No traffic trend data available yet" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="gVisitors" x1="0" y1="0" x2="0" y2="1">
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

                <linearGradient id="gSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--chart-2))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--chart-2))"
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
                dataKey="visitors"
                stroke="hsl(var(--chart-1))"
                fill="url(#gVisitors)"
                strokeWidth={2}
                name="Visitors"
              />
              <Area
                type="monotone"
                dataKey="sessions"
                stroke="hsl(var(--chart-2))"
                fill="url(#gSessions)"
                strokeWidth={2}
                name="Sessions"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <PieChartCard
        title="By Country"
        subtitle="Visitor distribution by country"
        data={countryData}
      />

      <PieChartCard
        title="By Device"
        subtitle="Traffic split by device type"
        data={deviceData}
      />

      <PieChartCard
        title="By Browser"
        subtitle="Most common browser environments"
        data={browserData}
      />

      <PieChartCard
        title="By OS"
        subtitle="Operating system distribution"
        data={osData}
      />

      <BarChartCard
        title="By Referrer"
        subtitle="Visitor-level acquisition normalized by source host"
        data={referrerData}
        barColor="hsl(var(--chart-1))"
      />

      <AttributionBarChartCard
        title="First-Touch Source"
        subtitle="Where visitors were originally acquired"
        data={firstTouchSourceData}
        fallbackLabel={firstTouchSourceFallback}
        emptyMessage="No visitor-level first-touch source tagging detected yet"
        barColor="hsl(var(--chart-2))"
      />

      <AttributionBarChartCard
        title="First-Touch Medium"
        subtitle="Original acquisition channel at visitor level"
        data={firstTouchMediumData}
        fallbackLabel={firstTouchMediumFallback}
        emptyMessage="No visitor-level first-touch medium tagging detected yet"
        barColor="hsl(var(--chart-3))"
      />

      <AttributionBarChartCard
        title="First-Touch Campaign"
        subtitle="Original campaign attribution for first discovery"
        data={firstTouchCampaignData}
        fallbackLabel={firstTouchCampaignFallback}
        emptyMessage="No visitor-level first-touch campaign tagging detected yet"
        barColor="hsl(var(--chart-4))"
      />

      <AttributionBarChartCard
        title="Session Source"
        subtitle="UTM source recorded across all tracked sessions"
        data={sessionSourceData}
        fallbackLabel={sessionSourceFallback}
        emptyMessage="No session-level UTM source tagging detected yet"
        barColor="hsl(var(--chart-5))"
      />

      <AttributionBarChartCard
        title="Session Medium"
        subtitle="UTM medium distribution across all tracked sessions"
        data={sessionMediumData}
        fallbackLabel={sessionMediumFallback}
        emptyMessage="No session-level UTM medium tagging detected yet"
        barColor="hsl(var(--chart-6))"
      />

      <AttributionBarChartCard
        title="Session Campaign"
        subtitle="Campaign-tagged sessions based on session-level UTM values"
        data={sessionCampaignData}
        fallbackLabel={sessionCampaignFallback}
        emptyMessage="No session-level UTM campaign tagging detected yet"
        barColor="hsl(var(--chart-4))"
      />
    </div>
  );
}

function PieChartCard({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle?: string;
  data: ChartRow[];
}) {
  return (
    <ChartContainer title={title} subtitle={subtitle}>
      {data.length === 0 ? (
        <EmptyState message={`No ${title.toLowerCase()} data available yet`} />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, percent }) =>
                percent && percent >= 0.08
                  ? `${name} ${(percent * 100).toFixed(0)}%`
                  : ''
              }
              labelLine={false}
              fontSize={11}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={getChartColor(index)} />
              ))}
            </Pie>

            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [
                `${value}`,
                formatCountTooltipLabel(name),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}

function BarChartCard({
  title,
  subtitle,
  data,
  barColor = 'hsl(var(--chart-1))',
}: {
  title: string;
  subtitle?: string;
  data: ChartRow[];
  barColor?: string;
}) {
  return (
    <ChartContainer title={title} subtitle={subtitle}>
      {data.length === 0 ? (
        <EmptyState message={`No ${title.toLowerCase()} data available yet`} />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
            />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
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
              formatter={(value: number, name: string) => [
                `${value}`,
                formatCountTooltipLabel(name),
              ]}
            />
            <Bar dataKey="value" fill={barColor} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}

function AttributionBarChartCard({
  title,
  subtitle,
  data,
  fallbackLabel,
  emptyMessage,
  barColor,
}: {
  title: string;
  subtitle?: string;
  data: ChartRow[];
  fallbackLabel: string;
  emptyMessage: string;
  barColor: string;
}) {
  const meaningfulData = data.filter((row) => row.name !== fallbackLabel);
  const shouldShowEmptyState =
    data.length === 0 || !hasMeaningfulAttribution(data, fallbackLabel);

  return (
    <ChartContainer title={title} subtitle={subtitle}>
      {shouldShowEmptyState ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={meaningfulData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
            />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
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
              formatter={(value: number, name: string) => [
                `${value}`,
                formatCountTooltipLabel(name),
              ]}
            />
            <Bar dataKey="value" fill={barColor} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}