import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, EmptyState, LoadingState, ErrorState } from './ChartContainer';
import { useVisitors } from '@/hooks/useAnalyticsData';

export function ReturningVisitorAnalytics() {
  const { data: visitors, loading, error } = useVisitors();

  const returning = useMemo(() => visitors.filter(v => v.total_sessions > 1), [visitors]);
  const frequent = useMemo(() => visitors.filter(v => v.total_sessions >= 3), [visitors]);

  const revisitBuckets = useMemo(() => {
    const buckets: Record<string, number> = { 'Same Day': 0, 'Within 7 Days': 0, 'Within 30 Days': 0, '30+ Days': 0 };
    returning.forEach(v => {
      const first = new Date(v.first_visit_at).getTime();
      const last = new Date(v.last_visit_at).getTime();
      const days = (last - first) / (1000 * 60 * 60 * 24);
      if (days < 1) buckets['Same Day']++;
      else if (days < 7) buckets['Within 7 Days']++;
      else if (days < 30) buckets['Within 30 Days']++;
      else buckets['30+ Days']++;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [returning]);

  const sessionCountDist = useMemo(() => {
    const counts: Record<string, number> = {};
    visitors.forEach(v => {
      const key = v.total_sessions >= 5 ? '5+' : String(v.total_sessions);
      counts[key] = (counts[key] || 0) + 1;
    });
    return ['1', '2', '3', '4', '5+'].filter(k => counts[k]).map(name => ({ name: `${name} session${name === '1' ? '' : 's'}`, value: counts[name] }));
  }, [visitors]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="kpi-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Returning Visitors</p>
          <p className="text-3xl font-display font-bold mt-1">{returning.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Came back at least once</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Frequent Visitors</p>
          <p className="text-3xl font-display font-bold mt-1">{frequent.length}</p>
          <p className="text-xs text-muted-foreground mt-1">3+ sessions</p>
        </div>
      </div>

      <ChartContainer title="Revisit Time Gap" subtitle="How soon do visitors return">
        {returning.length === 0 ? <EmptyState message="No returning visitors yet" /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revisitBuckets}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer title="Session Count Distribution" subtitle="How many sessions per visitor" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={sessionCountDist}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
