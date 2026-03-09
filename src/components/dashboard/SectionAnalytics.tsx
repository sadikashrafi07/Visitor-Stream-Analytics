import { useMemo } from 'react';
import {
  BarChart,
  Bar,
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
import { useSectionEngagement } from '@/hooks/useAnalyticsData';
import { formatSectionName, formatDuration } from '@/lib/analytics-utils';

type SectionStat = {
  rawName: string;
  name: string;
  totalTime: number;
  viewCount: number;
  avgTime: number;
};

type ChartRow = {
  name: string;
  value: number;
};

export function SectionAnalytics() {
  const { data, loading, error } = useSectionEngagement();

  const sectionStats = useMemo<SectionStat[]>(() => {
    const map: Record<string, { total: number; count: number }> = {};

    for (const row of data) {
      if (!map[row.section_name]) {
        map[row.section_name] = { total: 0, count: 0 };
      }

      map[row.section_name].total += row.time_spent_seconds;
      map[row.section_name].count += 1;
    }

    return Object.entries(map)
      .map(([rawName, stats]) => ({
        rawName,
        name: formatSectionName(rawName),
        totalTime: stats.total,
        viewCount: stats.count,
        avgTime: stats.count > 0 ? stats.total / stats.count : 0,
      }))
      .sort((a, b) => b.totalTime - a.totalTime);
  }, [data]);

  const totalTimeData = useMemo<ChartRow[]>(
    () =>
      sectionStats.map((section) => ({
        name: section.name,
        value: section.totalTime,
      })),
    [sectionStats]
  );

  const avgTimeData = useMemo<ChartRow[]>(
    () =>
      [...sectionStats]
        .sort((a, b) => b.avgTime - a.avgTime)
        .map((section) => ({
          name: section.name,
          value: Math.round(section.avgTime),
        })),
    [sectionStats]
  );

  const viewCountData = useMemo<ChartRow[]>(
    () =>
      [...sectionStats]
        .sort((a, b) => b.viewCount - a.viewCount)
        .map((section) => ({
          name: section.name,
          value: section.viewCount,
        })),
    [sectionStats]
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (sectionStats.length === 0) {
    return <EmptyState message="No section engagement data yet" />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartContainer
        title="Total Time by Section"
        subtitle="Which sections hold visitor attention the longest"
      >
        {totalTimeData.length === 0 ? (
          <EmptyState message="No total time data available yet" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={totalTimeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
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
                formatter={(value: number) => [formatDuration(value), 'Total Time']}
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

      <ChartContainer
        title="Average Time per View"
        subtitle="Average engagement depth for each section visit"
      >
        {avgTimeData.length === 0 ? (
          <EmptyState message="No average time data available yet" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={avgTimeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
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
                formatter={(value: number) => [`${value}s`, 'Avg Time']}
              />
              <Bar
                dataKey="value"
                fill="hsl(var(--chart-3))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer
        title="Most Viewed Sections"
        subtitle="Sections with the highest number of engagement records"
      >
        {viewCountData.length === 0 ? (
          <EmptyState message="No section view counts available yet" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={viewCountData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
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
                formatter={(value: number) => [`${value}`, 'Views']}
              />
              <Bar
                dataKey="value"
                fill="hsl(var(--chart-2))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer
        title="Section Ranking"
        subtitle="Combined ranking by views and engagement time"
      >
        {sectionStats.length === 0 ? (
          <EmptyState message="No ranked section data available yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 text-left font-medium">#</th>
                  <th className="py-2 text-left font-medium">Section</th>
                  <th className="py-2 text-right font-medium">Views</th>
                  <th className="py-2 text-right font-medium">Total Time</th>
                  <th className="py-2 text-right font-medium">Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {sectionStats.map((section, index) => (
                  <tr
                    key={section.rawName}
                    className="border-b border-border/50"
                  >
                    <td className="py-2 text-muted-foreground">{index + 1}</td>
                    <td className="py-2 font-medium">{section.name}</td>
                    <td className="py-2 text-right">{section.viewCount}</td>
                    <td className="py-2 text-right">
                      {formatDuration(section.totalTime)}
                    </td>
                    <td className="py-2 text-right">
                      {formatDuration(section.avgTime)}
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