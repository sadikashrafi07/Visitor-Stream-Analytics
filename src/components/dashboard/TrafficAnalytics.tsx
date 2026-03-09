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
import { useDailyMetrics, useVisitors } from '@/hooks/useAnalyticsData';
import {
  formatShortDate,
  getChartColor,
  sortedEntries,
} from '@/lib/analytics-utils';

type ChartRow = {
  name: string;
  value: number;
};

type DailyTrafficRow = {
  date: string;
  visitors: number;
  sessions: number;
};

function normalizeLabel(value: string | null | undefined, fallback: string) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function truncateLabel(value: string, max = 30) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function buildCountRows(values: Array<string | null | undefined>, fallback: string): ChartRow[] {
  const counts: Record<string, number> = {};

  for (const value of values) {
    const normalized = normalizeLabel(value, fallback);
    counts[normalized] = (counts[normalized] || 0) + 1;
  }

  return sortedEntries(counts).map(([name, value]) => ({
    name,
    value,
  }));
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
  } = useVisitors();

  const dailyData = useMemo<DailyTrafficRow[]>(
    () =>
      metrics.map((metric) => ({
        date: formatShortDate(metric.metric_date),
        visitors: metric.total_visitors,
        sessions: metric.total_sessions,
      })),
    [metrics]
  );

  const countryData = useMemo<ChartRow[]>(
    () => buildCountRows(visitors.map((visitor) => visitor.country), 'Unknown'),
    [visitors]
  );

  const deviceData = useMemo<ChartRow[]>(
    () => buildCountRows(visitors.map((visitor) => visitor.device_type), 'Unknown'),
    [visitors]
  );

  const browserData = useMemo<ChartRow[]>(
    () => buildCountRows(visitors.map((visitor) => visitor.browser), 'Unknown'),
    [visitors]
  );

  const osData = useMemo<ChartRow[]>(
    () => buildCountRows(visitors.map((visitor) => visitor.os), 'Unknown'),
    [visitors]
  );

  const referrerData = useMemo<ChartRow[]>(
    () =>
      buildCountRows(
        visitors.map((visitor) => visitor.referrer),
        'Direct'
      ).map((row) => ({
        ...row,
        name: truncateLabel(row.name, 32),
      })),
    [visitors]
  );

  const utmSourceData = useMemo<ChartRow[]>(
    () =>
      buildCountRows(
        visitors.map((visitor) => visitor.first_utm_source),
        'Organic / Direct'
      ),
    [visitors]
  );

  const isLoading = metricsLoading || visitorsLoading;
  const error = metricsError || visitorsError || null;

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
        subtitle="Traffic acquisition source"
        data={referrerData}
      />

      <BarChartCard
        title="First-Touch UTM Source"
        subtitle="How visitors first discovered the portfolio"
        data={utmSourceData}
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
              width={130}
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
              fill="hsl(var(--chart-1))"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}