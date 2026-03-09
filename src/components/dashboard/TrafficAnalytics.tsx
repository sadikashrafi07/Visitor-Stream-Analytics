import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, EmptyState, LoadingState, ErrorState } from './ChartContainer';
import { useDailyMetrics, useVisitors } from '@/hooks/useAnalyticsData';
import { formatShortDate, getChartColor, sortedEntries } from '@/lib/analytics-utils';

export function TrafficAnalytics() {
  const { data: metrics, loading: ml, error: me } = useDailyMetrics();
  const { data: visitors, loading: vl, error: ve } = useVisitors();

  const dailyData = useMemo(() =>
    metrics.map(m => ({
      date: formatShortDate(m.metric_date),
      visitors: m.total_visitors,
      sessions: m.total_sessions,
    })),
  [metrics]);

  const countryData = useMemo(() => {
    const counts: Record<string, number> = {};
    visitors.forEach(v => { const c = v.country || 'Unknown'; counts[c] = (counts[c] || 0) + 1; });
    return sortedEntries(counts).map(([name, value]) => ({ name, value }));
  }, [visitors]);

  const deviceData = useMemo(() => {
    const counts: Record<string, number> = {};
    visitors.forEach(v => { const d = v.device_type || 'Unknown'; counts[d] = (counts[d] || 0) + 1; });
    return sortedEntries(counts).map(([name, value]) => ({ name, value }));
  }, [visitors]);

  const browserData = useMemo(() => {
    const counts: Record<string, number> = {};
    visitors.forEach(v => { const b = v.browser || 'Unknown'; counts[b] = (counts[b] || 0) + 1; });
    return sortedEntries(counts).map(([name, value]) => ({ name, value }));
  }, [visitors]);

  const osData = useMemo(() => {
    const counts: Record<string, number> = {};
    visitors.forEach(v => { const o = v.os || 'Unknown'; counts[o] = (counts[o] || 0) + 1; });
    return sortedEntries(counts).map(([name, value]) => ({ name, value }));
  }, [visitors]);

  const referrerData = useMemo(() => {
    const counts: Record<string, number> = {};
    visitors.forEach(v => { const r = v.referrer || 'Direct'; counts[r] = (counts[r] || 0) + 1; });
    return sortedEntries(counts).map(([name, value]) => ({ name: name.length > 30 ? name.substring(0, 30) + '…' : name, value }));
  }, [visitors]);

  const utmSourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    visitors.forEach(v => { const s = v.first_utm_source || 'Organic / Direct'; counts[s] = (counts[s] || 0) + 1; });
    return sortedEntries(counts).map(([name, value]) => ({ name, value }));
  }, [visitors]);

  if (ml || vl) return <LoadingState />;
  if (me || ve) return <ErrorState message={me || ve || ''} />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartContainer title="Visitors & Sessions by Day" subtitle="Daily traffic trend" className="lg:col-span-2">
        {dailyData.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="gVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
              <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="visitors" stroke="hsl(var(--chart-1))" fill="url(#gVisitors)" strokeWidth={2} />
              <Area type="monotone" dataKey="sessions" stroke="hsl(var(--chart-2))" fill="url(#gSessions)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <PieChartCard title="By Country" data={countryData} />
      <PieChartCard title="By Device" data={deviceData} />
      <PieChartCard title="By Browser" data={browserData} />
      <PieChartCard title="By OS" data={osData} />
      <BarChartCard title="By Referrer" subtitle="Traffic acquisition source" data={referrerData} />
      <BarChartCard title="First-Touch UTM Source" subtitle="How visitors first discovered the portfolio" data={utmSourceData} />
    </div>
  );
}

function PieChartCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  if (data.length === 0) return <ChartContainer title={title}><EmptyState /></ChartContainer>;
  return (
    <ChartContainer title={title}>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
            {data.map((_, i) => <Cell key={i} fill={getChartColor(i)} />)}
          </Pie>
          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

function BarChartCard({ title, subtitle, data }: { title: string; subtitle?: string; data: { name: string; value: number }[] }) {
  if (data.length === 0) return <ChartContainer title={title} subtitle={subtitle}><EmptyState /></ChartContainer>;
  return (
    <ChartContainer title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
          <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
