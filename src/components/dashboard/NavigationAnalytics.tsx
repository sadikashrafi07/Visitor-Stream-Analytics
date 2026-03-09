import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, EmptyState, LoadingState, ErrorState } from './ChartContainer';
import { useEvents } from '@/hooks/useAnalyticsData';
import { safeParseJSON, formatSectionName } from '@/lib/analytics-utils';

export function NavigationAnalytics() {
  const { data: events, loading, error } = useEvents();

  const navData = useMemo(() => {
    const navEvents = events.filter(e => e.event_name === 'nav_click');
    const counts: Record<string, number> = {};
    navEvents.forEach(e => {
      const props = safeParseJSON<Record<string, string>>(e.properties, {});
      const target = props.target || props.label || 'Unknown';
      counts[target] = (counts[target] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name: formatSectionName(name), value }));
  }, [events]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartContainer title="Navbar Click Targets" subtitle="Which sections visitors jump to directly (recent activity)">
        {navData.length === 0 ? <EmptyState message="No navigation click data yet" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={navData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="hsl(var(--chart-6))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer title="Direct-Interest Sections" subtitle="Sections visitors intentionally navigate to">
        {navData.length === 0 ? <EmptyState /> : (
          <div className="space-y-3">
            {navData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground w-6">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.value} clicks</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(item.value / navData[0].value) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartContainer>
    </div>
  );
}
