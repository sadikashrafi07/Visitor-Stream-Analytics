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
import {
  useSectionEngagement,
  useSessions,
} from '@/hooks/useAnalyticsData';
import { formatSectionName, formatDuration } from '@/lib/analytics-utils';

type SectionStat = {
  rawName: string;
  name: string;
  totalTime: number;
  viewCount: number;
  avgTime: number;
  rankScore: number;
};

type ChartRow = {
  name: string;
  value: number;
};

function toSafeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSeconds(value: unknown) {
  return Math.max(0, Math.floor(toSafeNumber(value, 0)));
}

function normalizeSectionName(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hasTrackedSessionId(session: { session_id?: string | null }) {
  return Boolean(typeof session.session_id === 'string' && session.session_id.trim());
}

export function SectionAnalytics() {
  const {
    data: sectionEngagement,
    loading: sectionLoading,
    error: sectionError,
  } = useSectionEngagement(false, true);

  const {
    data: sessions,
    loading: sessionsLoading,
    error: sessionsError,
  } = useSessions(false, true);

  const validSessionIds = useMemo(() => {
    return new Set(
      sessions
        .filter((session) => hasTrackedSessionId(session))
        .map((session) => session.session_id as string)
    );
  }, [sessions]);

  const sectionStats = useMemo<SectionStat[]>(() => {
    const map = new Map<
      string,
      {
        totalTime: number;
        sessionIds: Set<string>;
      }
    >();

    for (const row of sectionEngagement) {
      const sessionId =
        typeof row.session_id === 'string' ? row.session_id.trim() : '';

      if (!sessionId || (validSessionIds.size > 0 && !validSessionIds.has(sessionId))) {
        continue;
      }

      const rawName = normalizeSectionName(row.section_name);
      if (!rawName) continue;

      const seconds = normalizeSeconds(row.time_spent_seconds);

      if (!map.has(rawName)) {
        map.set(rawName, {
          totalTime: 0,
          sessionIds: new Set<string>(),
        });
      }

      const entry = map.get(rawName)!;
      entry.totalTime += seconds;
      entry.sessionIds.add(sessionId);
    }

    const baseStats = Array.from(map.entries()).map(([rawName, stats]) => {
      const viewCount = stats.sessionIds.size;
      const totalTime = stats.totalTime;
      const avgTime = viewCount > 0 ? totalTime / viewCount : 0;

      return {
        rawName,
        name: formatSectionName(rawName),
        totalTime,
        viewCount,
        avgTime,
      };
    });

    const maxTotalTime = Math.max(
      1,
      ...baseStats.map((section) => section.totalTime)
    );

    const maxViewCount = Math.max(
      1,
      ...baseStats.map((section) => section.viewCount)
    );

    return baseStats
      .map((section) => {
        const totalTimeScore = (section.totalTime / maxTotalTime) * 100;
        const viewScore = (section.viewCount / maxViewCount) * 100;

        const rankScore = Math.round(
          clamp(totalTimeScore * 0.65 + viewScore * 0.35, 0, 100)
        );

        return {
          ...section,
          rankScore,
        };
      })
      .sort((a, b) => {
        if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
        if (b.totalTime !== a.totalTime) return b.totalTime - a.totalTime;
        if (b.viewCount !== a.viewCount) return b.viewCount - a.viewCount;
        return a.name.localeCompare(b.name);
      });
  }, [sectionEngagement, validSessionIds]);

  const totalTimeData = useMemo<ChartRow[]>(
    () =>
      [...sectionStats]
        .sort((a, b) => b.totalTime - a.totalTime)
        .map((section) => ({
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

  const loading = sectionLoading || sessionsLoading;
  const error = sectionError || sessionsError || null;

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
        subtitle="Average engagement depth for each tracked section visit"
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
                formatter={(value: number) => [formatDuration(value), 'Avg Time']}
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
        subtitle="Sections with the highest number of unique tracked session visits"
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