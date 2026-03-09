import { useMemo } from 'react';
import { KpiCard } from './KpiCard';
import { LoadingState, ErrorState } from './ChartContainer';
import { useDailyMetrics, useVisitors, useSessionAnalytics } from '@/hooks/useAnalyticsData';
import { formatDuration, formatPercent, formatNumber } from '@/lib/analytics-utils';
import { Users, Activity, Clock, BarChart3, Download, Mail, Target, Repeat } from 'lucide-react';

export function OverviewKpis() {
  const { data: metrics, loading: ml, error: me } = useDailyMetrics();
  const { data: visitors, loading: vl, error: ve } = useVisitors();
  const { data: sessions, loading: sl, error: se } = useSessionAnalytics();

  const kpis = useMemo(() => {
    const totalVisitors = visitors.length;
    const totalSessions = metrics.reduce((s, m) => s + m.total_sessions, 0) || sessions.length;
    const avgDuration = sessions.length > 0 ? sessions.reduce((s, x) => s + x.duration_seconds, 0) / sessions.length : 0;
    const bounces = sessions.filter(s => {
      const sv = typeof s.sections_visited === 'string' ? s.sections_visited : '[]';
      try { return JSON.parse(sv).length <= 1; } catch { return true; }
    }).length;
    const bounceRate = sessions.length > 0 ? (bounces / sessions.length) * 100 : 0;
    const resumeDownloads = sessions.reduce((s, x) => s + x.resume_downloads, 0);
    const contactSubmits = sessions.reduce((s, x) => s + x.contact_submits, 0);
    const totalConversions = resumeDownloads + contactSubmits;
    const avgEngagement = sessions.length > 0 ? sessions.reduce((s, x) => s + x.engagement_score, 0) / sessions.length : 0;
    const returning = visitors.filter(v => v.total_sessions > 1).length;
    const frequent = visitors.filter(v => v.total_sessions >= 3).length;

    return { totalVisitors, totalSessions, avgDuration, bounceRate, resumeDownloads, contactSubmits, totalConversions, avgEngagement, returning, frequent };
  }, [metrics, visitors, sessions]);

  if (ml || vl || sl) return <LoadingState />;
  if (me || ve || se) return <ErrorState message={me || ve || se || 'Unknown error'} />;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <KpiCard title="Visitors" value={formatNumber(kpis.totalVisitors)} icon={<Users className="h-4 w-4" />} tooltip="Total unique visitors tracked" />
      <KpiCard title="Sessions" value={formatNumber(kpis.totalSessions)} icon={<Activity className="h-4 w-4" />} tooltip="Total browsing sessions" />
      <KpiCard title="Avg Duration" value={formatDuration(kpis.avgDuration)} icon={<Clock className="h-4 w-4" />} tooltip="Average time per session" />
      <KpiCard title="Bounce Rate" value={formatPercent(kpis.bounceRate)} icon={<BarChart3 className="h-4 w-4" />} tooltip="Sessions that viewed only one section" />
      <KpiCard title="Resume Downloads" value={kpis.resumeDownloads} icon={<Download className="h-4 w-4" />} tooltip="Strong hiring-intent signal" />
      <KpiCard title="Contact Submits" value={kpis.contactSubmits} icon={<Mail className="h-4 w-4" />} tooltip="Contact form submissions — direct recruiter interest" />
      <KpiCard title="Total Conversions" value={kpis.totalConversions} icon={<Target className="h-4 w-4" />} tooltip="Resume downloads + contact form submits" />
      <KpiCard title="Avg Engagement" value={kpis.avgEngagement.toFixed(0)} icon={<BarChart3 className="h-4 w-4" />} tooltip="0-100 composite score based on actions taken" subtitle="/100" />
      <KpiCard title="Returning" value={kpis.returning} icon={<Repeat className="h-4 w-4" />} tooltip="Visitors who came back more than once" />
      <KpiCard title="Frequent" value={kpis.frequent} icon={<Repeat className="h-4 w-4" />} tooltip="Visitors with 3+ sessions" />
    </div>
  );
}
