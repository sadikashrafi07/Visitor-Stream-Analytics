import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ChartContainer, EmptyState, LoadingState, ErrorState } from './ChartContainer';
import { useDailyMetrics, useSessionAnalytics } from '@/hooks/useAnalyticsData';
import { formatShortDate, formatDuration } from '@/lib/analytics-utils';

export function EngagementAnalytics() {
  const { data: metrics, loading: ml, error: me } = useDailyMetrics();
  const { data: sessions, loading: sl, error: se } = useSessionAnalytics();

  const trendData = useMemo(() =>
    metrics.map(m => ({
      date: formatShortDate(m.metric_date),
      duration: parseFloat(m.avg_session_duration) || 0,
      bounceRate: parseFloat(m.bounce_rate) * 100 || 0,
      engagement: parseFloat(m.avg_engagement_score) || 0,
    })),
  [metrics]);

  const scrollDistribution = useMemo(() => {
    const buckets: Record<string, number> = { '0-25%': 0, '25-50%': 0, '50-75%': 0, '75-100%': 0 };
    sessions.forEach(s => {
      const d = s.max_scroll_depth;
      if (d <= 25) buckets['0-25%']++;
      else if (d <= 50) buckets['25-50%']++;
      else if (d <= 75) buckets['50-75%']++;
      else buckets['75-100%']++;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [sessions]);

  const qualityBuckets = useMemo(() => {
    const buckets: Record<string, number> = { 'Low (0-20)': 0, 'Medium (20-50)': 0, 'High (50-80)': 0, 'Exceptional (80+)': 0 };
    sessions.forEach(s => {
      const e = s.engagement_score;
      if (e < 20) buckets['Low (0-20)']++;
      else if (e < 50) buckets['Medium (20-50)']++;
      else if (e < 80) buckets['High (50-80)']++;
      else buckets['Exceptional (80+)']++;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [sessions]);

  const topSessions = useMemo(() =>
    [...sessions].sort((a, b) => b.engagement_score - a.engagement_score).slice(0, 5),
  [sessions]);

  if (ml || sl) return <LoadingState />;
  if (me || se) return <ErrorState message={me || se || ''} />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartContainer title="Avg Session Duration Trend" subtitle="Seconds per session over time" className="lg:col-span-2">
        {trendData.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="gDur" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatDuration(v)} />
              <Area type="monotone" dataKey="duration" stroke="hsl(var(--chart-1))" fill="url(#gDur)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer title="Engagement Score Trend">
        {trendData.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="engagement" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer title="Scroll Depth Distribution" subtitle="How far visitors scroll">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={scrollDistribution}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ChartContainer title="Session Quality Categories" subtitle="Engagement score distribution">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={qualityBuckets}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
            <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="value" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ChartContainer title="Top Engaged Sessions" subtitle="Highest engagement scores" className="lg:col-span-2">
        {topSessions.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left py-2 font-medium">Visitor</th>
                  <th className="text-left py-2 font-medium">Duration</th>
                  <th className="text-left py-2 font-medium">Scroll</th>
                  <th className="text-left py-2 font-medium">Sections</th>
                  <th className="text-left py-2 font-medium">Score</th>
                  <th className="text-left py-2 font-medium">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {topSessions.map(s => (
                  <tr key={s.session_id} className="border-b border-border/50">
                    <td className="py-2 font-mono text-xs text-muted-foreground">{s.visitor_id.slice(0, 8)}…</td>
                    <td className="py-2">{formatDuration(s.duration_seconds)}</td>
                    <td className="py-2">{s.max_scroll_depth}%</td>
                    <td className="py-2">{s.sections_count}</td>
                    <td className="py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{s.engagement_score}</span>
                    </td>
                    <td className="py-2 flex gap-1">
                      {s.conversion_resume && <span className="analytics-badge bg-success/10 text-success">Resume</span>}
                      {s.conversion_contact && <span className="analytics-badge bg-primary/10 text-primary">Contact</span>}
                      {!s.has_conversion && <span className="text-xs text-muted-foreground">—</span>}
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
