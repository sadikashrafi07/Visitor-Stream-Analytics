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
} from 'recharts';
import {
  ChartContainer,
  EmptyState,
  LoadingState,
  ErrorState,
} from './ChartContainer';
import {
  useDailyMetrics,
  useSessions,
  useEvents,
  useSectionEngagement,
} from '@/hooks/useAnalyticsData';
import {
  formatShortDate,
  formatDuration,
  safeParseJSON,
} from '@/lib/analytics-utils';

type SessionDerivedStats = {
  session_id: string;
  visitor_id: string;
  duration_seconds: number;
  is_bounce: boolean;
  max_scroll_depth: number;
  unique_sections_count: number;
  total_section_time_seconds: number;
  conversion_resume: boolean;
  conversion_contact: boolean;
  has_conversion: boolean;
  quality_score: number;
  quality_label: 'High Intent' | 'Engaged' | 'Passive';
};

type ScrollDepthProps = {
  depth?: number;
};

const RESUME_EVENT = 'resume_download';
const CONTACT_SUCCESS_EVENT = 'contact_submit_success';
const SCROLL_DEPTH_EVENT = 'scroll_depth';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getSessionQuality(
  durationSeconds: number,
  maxScrollDepth: number,
  uniqueSectionsCount: number,
  totalSectionTimeSeconds: number,
  hasResumeConversion: boolean,
  hasContactConversion: boolean,
  isBounce: boolean
): Pick<SessionDerivedStats, 'quality_score' | 'quality_label'> {
  let score = 0;

  if (hasResumeConversion) score += 35;
  if (hasContactConversion) score += 35;

  score += clamp(durationSeconds / 20, 0, 20);
  score += clamp(maxScrollDepth / 10, 0, 10);
  score += clamp(uniqueSectionsCount * 4, 0, 20);
  score += clamp(totalSectionTimeSeconds / 6, 0, 20);

  if (isBounce) score -= 10;

  const looksPassive =
    durationSeconds >= 300 &&
    maxScrollDepth === 0 &&
    uniqueSectionsCount === 0 &&
    totalSectionTimeSeconds === 0 &&
    !hasResumeConversion &&
    !hasContactConversion;

  if (looksPassive) {
    score = Math.min(score, 8);
  }

  const normalized = clamp(Math.round(score), 0, 100);

  let qualityLabel: SessionDerivedStats['quality_label'] = 'Passive';
  if (normalized >= 65) qualityLabel = 'High Intent';
  else if (normalized >= 25) qualityLabel = 'Engaged';

  return {
    quality_score: normalized,
    quality_label: qualityLabel,
  };
}

export function EngagementAnalytics() {
  const {
    data: metrics,
    loading: metricsLoading,
    error: metricsError,
  } = useDailyMetrics();

  const {
    data: sessions,
    loading: sessionsLoading,
    error: sessionsError,
  } = useSessions();

  const {
    data: events,
    loading: eventsLoading,
    error: eventsError,
  } = useEvents();

  const {
    data: sectionEngagement,
    loading: sectionLoading,
    error: sectionError,
  } = useSectionEngagement();

  const trendData = useMemo(
    () =>
      metrics.map((metric) => ({
        date: formatShortDate(metric.metric_date),
        duration: parseFloat(metric.avg_session_duration) || 0,
        bounceRate: (parseFloat(metric.bounce_rate) || 0) * 100,
        engagement: parseFloat(metric.avg_engagement_score) || 0,
      })),
    [metrics]
  );

  const sessionDerivedStats = useMemo<SessionDerivedStats[]>(() => {
    const scrollBySession = new Map<string, number>();
    const uniqueSectionsBySession = new Map<string, Set<string>>();
    const totalSectionTimeBySession = new Map<string, number>();
    const resumeBySession = new Set<string>();
    const contactBySession = new Set<string>();

    for (const event of events) {
      if (!event.session_id) continue;

      if (event.event_name === SCROLL_DEPTH_EVENT) {
        const props = safeParseJSON<ScrollDepthProps>(event.properties, {});
        const depth = Number(props.depth ?? 0);
        const normalizedDepth = Number.isFinite(depth) ? depth : 0;
        const currentDepth = scrollBySession.get(event.session_id) ?? 0;

        scrollBySession.set(
          event.session_id,
          Math.max(currentDepth, normalizedDepth)
        );
      }

      if (event.event_name === RESUME_EVENT) {
        resumeBySession.add(event.session_id);
      }

      if (event.event_name === CONTACT_SUCCESS_EVENT) {
        contactBySession.add(event.session_id);
      }
    }

    for (const row of sectionEngagement) {
      if (!row.session_id) continue;

      if (!uniqueSectionsBySession.has(row.session_id)) {
        uniqueSectionsBySession.set(row.session_id, new Set<string>());
      }

      uniqueSectionsBySession.get(row.session_id)?.add(row.section_name);

      totalSectionTimeBySession.set(
        row.session_id,
        (totalSectionTimeBySession.get(row.session_id) ?? 0) +
          Number(row.time_spent_seconds || 0)
      );
    }

    return sessions.map((session) => {
      const uniqueSectionsCount =
        uniqueSectionsBySession.get(session.session_id)?.size ?? 0;
      const totalSectionTimeSeconds =
        totalSectionTimeBySession.get(session.session_id) ?? 0;

      const conversionResume = resumeBySession.has(session.session_id);
      const conversionContact = contactBySession.has(session.session_id);
      const hasConversion = conversionResume || conversionContact;

      const quality = getSessionQuality(
        session.duration_seconds,
        scrollBySession.get(session.session_id) ?? 0,
        uniqueSectionsCount,
        totalSectionTimeSeconds,
        conversionResume,
        conversionContact,
        session.is_bounce
      );

      return {
        session_id: session.session_id,
        visitor_id: session.visitor_id,
        duration_seconds: session.duration_seconds,
        is_bounce: session.is_bounce,
        max_scroll_depth: scrollBySession.get(session.session_id) ?? 0,
        unique_sections_count: uniqueSectionsCount,
        total_section_time_seconds: totalSectionTimeSeconds,
        conversion_resume: conversionResume,
        conversion_contact: conversionContact,
        has_conversion: hasConversion,
        quality_score: quality.quality_score,
        quality_label: quality.quality_label,
      };
    });
  }, [sessions, events, sectionEngagement]);

  const scrollDistribution = useMemo(() => {
    const buckets: Record<string, number> = {
      '0-25%': 0,
      '26-50%': 0,
      '51-75%': 0,
      '76-100%': 0,
    };

    for (const session of sessionDerivedStats) {
      const depth = session.max_scroll_depth;

      if (depth <= 25) buckets['0-25%'] += 1;
      else if (depth <= 50) buckets['26-50%'] += 1;
      else if (depth <= 75) buckets['51-75%'] += 1;
      else buckets['76-100%'] += 1;
    }

    return Object.entries(buckets).map(([name, value]) => ({
      name,
      value,
    }));
  }, [sessionDerivedStats]);

  const sessionQualityDistribution = useMemo(() => {
    const buckets: Record<SessionDerivedStats['quality_label'], number> = {
      'High Intent': 0,
      Engaged: 0,
      Passive: 0,
    };

    for (const session of sessionDerivedStats) {
      buckets[session.quality_label] += 1;
    }

    return [
      { name: 'High Intent', value: buckets['High Intent'] },
      { name: 'Engaged', value: buckets.Engaged },
      { name: 'Passive', value: buckets.Passive },
    ];
  }, [sessionDerivedStats]);

  const topSessions = useMemo(() => {
    return [...sessionDerivedStats]
      .sort((a, b) => {
        if (b.quality_score !== a.quality_score) {
          return b.quality_score - a.quality_score;
        }

        if (b.total_section_time_seconds !== a.total_section_time_seconds) {
          return b.total_section_time_seconds - a.total_section_time_seconds;
        }

        if (b.max_scroll_depth !== a.max_scroll_depth) {
          return b.max_scroll_depth - a.max_scroll_depth;
        }

        return b.duration_seconds - a.duration_seconds;
      })
      .slice(0, 5);
  }, [sessionDerivedStats]);

  const isLoading =
    metricsLoading || sessionsLoading || eventsLoading || sectionLoading;

  const error =
    metricsError || sessionsError || eventsError || sectionError || null;

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartContainer
        title="Avg Session Duration Trend"
        subtitle="Average session duration over time"
        className="lg:col-span-2"
      >
        {trendData.length === 0 ? (
          <EmptyState message="No engagement trend data available yet" />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="gDur" x1="0" y1="0" x2="0" y2="1">
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
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
              />
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
                formatter={(value: number) => formatDuration(value)}
              />
              <Area
                type="monotone"
                dataKey="duration"
                stroke="hsl(var(--chart-1))"
                fill="url(#gDur)"
                strokeWidth={2}
                name="Avg Duration"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer
        title="Engagement Score Trend"
        subtitle="Average engagement score by day"
      >
        {trendData.length === 0 ? (
          <EmptyState message="No engagement score trend available yet" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
              />
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
                dataKey="engagement"
                stroke="hsl(var(--chart-3))"
                fill="hsl(var(--chart-3))"
                fillOpacity={0.15}
                strokeWidth={2}
                name="Avg Engagement Score"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer
        title="Scroll Depth Distribution"
        subtitle="Maximum scroll depth reached per session"
      >
        {scrollDistribution.every((x) => x.value === 0) ? (
          <EmptyState message="No scroll depth data available yet" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scrollDistribution}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
              />
              <XAxis
                dataKey="name"
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
              <Bar
                dataKey="value"
                fill="hsl(var(--chart-2))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer
        title="Session Quality Categories"
        subtitle="Classified using conversions, section engagement, scroll depth, and duration confidence"
      >
        {sessionQualityDistribution.every((x) => x.value === 0) ? (
          <EmptyState message="No session quality data available yet" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sessionQualityDistribution}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
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
              <Bar
                dataKey="value"
                fill="hsl(var(--chart-4))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer
        title="Top Engaged Sessions"
        subtitle="Ranked by verified conversion signals, real section engagement, scroll depth, and duration confidence"
        className="lg:col-span-2"
      >
        {topSessions.length === 0 ? (
          <EmptyState message="No session data available yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 text-left font-medium">Visitor</th>
                  <th className="py-2 text-left font-medium">Duration</th>
                  <th className="py-2 text-left font-medium">Scroll</th>
                  <th className="py-2 text-left font-medium">Unique Sections</th>
                  <th className="py-2 text-left font-medium">Section Time</th>
                  <th className="py-2 text-left font-medium">Quality</th>
                  <th className="py-2 text-left font-medium">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {topSessions.map((session) => (
                  <tr
                    key={session.session_id}
                    className="border-b border-border/50"
                  >
                    <td className="py-2 font-mono text-xs text-muted-foreground">
                      {session.visitor_id.slice(0, 8)}…
                    </td>
                    <td className="py-2">
                      {formatDuration(session.duration_seconds)}
                    </td>
                    <td className="py-2">{session.max_scroll_depth}%</td>
                    <td className="py-2">{session.unique_sections_count}</td>
                    <td className="py-2">
                      {formatDuration(session.total_section_time_seconds)}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            session.quality_label === 'High Intent'
                              ? 'analytics-badge bg-success/10 text-success'
                              : session.quality_label === 'Engaged'
                              ? 'analytics-badge bg-primary/10 text-primary'
                              : 'analytics-badge bg-muted text-muted-foreground'
                          }
                        >
                          {session.quality_label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {session.quality_score}/100
                        </span>
                      </div>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        {session.conversion_resume && (
                          <span className="analytics-badge bg-success/10 text-success">
                            Resume
                          </span>
                        )}
                        {session.conversion_contact && (
                          <span className="analytics-badge bg-primary/10 text-primary">
                            Contact
                          </span>
                        )}
                        {!session.has_conversion && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
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