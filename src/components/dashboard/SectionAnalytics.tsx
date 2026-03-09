import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, EmptyState, LoadingState, ErrorState } from './ChartContainer';
import { useSectionEngagement } from '@/hooks/useAnalyticsData';
import { formatSectionName, formatDuration } from '@/lib/analytics-utils';

export function SectionAnalytics() {
  const { data, loading, error } = useSectionEngagement();

  const sectionStats = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    data.forEach(s => {
      if (!map[s.section_name]) map[s.section_name] = { total: 0, count: 0 };
      map[s.section_name].total += s.time_spent_seconds;
      map[s.section_name].count++;
    });
    return Object.entries(map)
      .map(([name, { total, count }]) => ({
        name: formatSectionName(name),
        rawName: name,
        totalTime: total,
        viewCount: count,
        avgTime: total / count,
      }))
      .sort((a, b) => b.totalTime - a.totalTime);
  }, [data]);

  const totalTimeData = useMemo(() =>
    sectionStats.map(s => ({ name: s.name, value: s.totalTime })),
  [sectionStats]);

  const avgTimeData = useMemo(() =>
    [...sectionStats].sort((a, b) => b.avgTime - a.avgTime).map(s => ({ name: s.name, value: Math.round(s.avgTime) })),
  [sectionStats]);

  const viewCountData = useMemo(() =>
    [...sectionStats].sort((a, b) => b.viewCount - a.viewCount).map(s => ({ name: s.name, value: s.viewCount })),
  [sectionStats]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (sectionStats.length === 0) return <EmptyState message="No section engagement data yet" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartContainer title="Total Time by Section" subtitle="Which sections hold attention longest">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={totalTimeData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatDuration(v)} />
            <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ChartContainer title="Average Time per View" subtitle="Engagement depth per section visit">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={avgTimeData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${v}s`} />
            <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ChartContainer title="Most Viewed Sections" subtitle="Number of times each section was viewed">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={viewCountData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ChartContainer title="Section Ranking" subtitle="Comprehensive section performance">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left py-2 font-medium">#</th>
                <th className="text-left py-2 font-medium">Section</th>
                <th className="text-right py-2 font-medium">Views</th>
                <th className="text-right py-2 font-medium">Total Time</th>
                <th className="text-right py-2 font-medium">Avg Time</th>
              </tr>
            </thead>
            <tbody>
              {sectionStats.map((s, i) => (
                <tr key={s.rawName} className="border-b border-border/50">
                  <td className="py-2 text-muted-foreground">{i + 1}</td>
                  <td className="py-2 font-medium">{s.name}</td>
                  <td className="py-2 text-right">{s.viewCount}</td>
                  <td className="py-2 text-right">{formatDuration(s.totalTime)}</td>
                  <td className="py-2 text-right">{formatDuration(s.avgTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartContainer>
    </div>
  );
}
