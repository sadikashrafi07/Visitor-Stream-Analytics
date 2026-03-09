import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, EmptyState, LoadingState, ErrorState } from './ChartContainer';
import { useDailyMetrics, useSessionAnalytics } from '@/hooks/useAnalyticsData';
import { formatShortDate } from '@/lib/analytics-utils';

export function ConversionAnalytics() {
  const { data: metrics, loading: ml, error: me } = useDailyMetrics();
  const { data: sessions, loading: sl, error: se } = useSessionAnalytics();

  const trendData = useMemo(() =>
    metrics.map(m => ({
      date: formatShortDate(m.metric_date),
      resumeDownloads: m.resume_downloads,
      contactSubmits: m.contact_submits,
      conversions: m.total_conversions,
    })),
  [metrics]);

  const conversionSessions = useMemo(() =>
    sessions.filter(s => s.has_conversion).length,
  [sessions]);

  const resumeTotal = useMemo(() => sessions.reduce((s, x) => s + x.resume_downloads, 0), [sessions]);
  const contactTotal = useMemo(() => sessions.reduce((s, x) => s + x.contact_submits, 0), [sessions]);
  const convRate = sessions.length > 0 ? (conversionSessions / sessions.length * 100) : 0;

  if (ml || sl) return <LoadingState />;
  if (me || se) return <ErrorState message={me || se || ''} />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="kpi-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Resume Downloads</p>
          <p className="text-3xl font-display font-bold mt-1 text-success">{resumeTotal}</p>
          <p className="text-xs text-muted-foreground mt-1">Strong hiring intent</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Contact Submits</p>
          <p className="text-3xl font-display font-bold mt-1 text-primary">{contactTotal}</p>
          <p className="text-xs text-muted-foreground mt-1">Direct recruiter interest</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Sessions with Conversion</p>
          <p className="text-2xl font-display font-bold mt-1">{conversionSessions}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Conversion Rate</p>
          <p className="text-2xl font-display font-bold mt-1">{convRate.toFixed(1)}%</p>
        </div>
      </div>

      <ChartContainer title="Conversions Over Time" subtitle="Resume downloads and contact submissions daily">
        {trendData.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="resumeDownloads" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.15} strokeWidth={2} name="Resume Downloads" />
              <Area type="monotone" dataKey="contactSubmits" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.15} strokeWidth={2} name="Contact Submits" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer title="Strongest Hiring-Intent Signals" subtitle="Actions that indicate recruiter interest" className="lg:col-span-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border p-4 bg-success/5">
            <p className="text-sm font-medium text-success">📄 Resume Download</p>
            <p className="text-xs text-muted-foreground mt-1">Visitor downloaded your resume — strongest signal of hiring interest</p>
          </div>
          <div className="rounded-lg border border-border p-4 bg-primary/5">
            <p className="text-sm font-medium text-primary">✉️ Contact Form Submit</p>
            <p className="text-xs text-muted-foreground mt-1">Visitor reached out directly — indicates strong interest or opportunity</p>
          </div>
          <div className="rounded-lg border border-border p-4 bg-warning/5">
            <p className="text-sm font-medium text-warning">🔍 Deep Engagement</p>
            <p className="text-xs text-muted-foreground mt-1">Sessions with score 50+ suggest serious evaluation of your profile</p>
          </div>
        </div>
      </ChartContainer>
    </div>
  );
}
