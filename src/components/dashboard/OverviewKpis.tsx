import { useMemo } from 'react';
import { KpiCard } from './KpiCard';
import { LoadingState, ErrorState } from './ChartContainer';
import {
  useDailyMetrics,
  useVisitors,
  useSessions,
  useEvents,
  useSectionEngagement,
} from '@/hooks/useAnalyticsData';
import {
  formatDuration,
  formatPercent,
  formatNumber,
} from '@/lib/analytics-utils';
import {
  Users,
  Activity,
  Clock,
  BarChart3,
  Download,
  Mail,
  Target,
  Repeat,
  MousePointerClick,
  Map,
  Sparkles,
} from 'lucide-react';

const RESUME_EVENT = 'resume_download';
const CONTACT_SUCCESS_EVENT = 'contact_submit_success';
const PROJECT_CLICK_EVENT = 'project_card_click';

function toSafeNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function OverviewKpis() {
  const {
    data: metrics,
    loading: metricsLoading,
    error: metricsError,
  } = useDailyMetrics();

  const {
    data: visitors,
    loading: visitorsLoading,
    error: visitorsError,
  } = useVisitors();

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

  const kpis = useMemo(() => {
    const latestMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null;

    const totalVisitors = visitors.length;

    const totalSessions = sessions.length;

    const avgDuration =
      sessions.length > 0
        ? sessions.reduce(
            (sum, session) => sum + toSafeNumber(session.duration_seconds),
            0
          ) / sessions.length
        : latestMetric?.avg_session_duration != null
        ? toSafeNumber(latestMetric.avg_session_duration)
        : 0;

    const bounceRate =
      sessions.length > 0
        ? (sessions.filter((session) => Boolean(session.is_bounce)).length /
            sessions.length) *
          100
        : latestMetric?.bounce_rate != null
        ? toSafeNumber(latestMetric.bounce_rate) * 100
        : 0;

    const resumeDownloads = events.filter(
      (event) => event.event_name === RESUME_EVENT
    ).length;

    const contactSubmits = events.filter(
      (event) => event.event_name === CONTACT_SUCCESS_EVENT
    ).length;

    const projectClicks = events.filter(
      (event) => event.event_name === PROJECT_CLICK_EVENT
    ).length;

    const totalConversions = resumeDownloads + contactSubmits;

    const uniqueEngagedSessions = new Set(
      sectionEngagement
        .map((row) => row.session_id)
        .filter((sessionId): sessionId is string => Boolean(sessionId))
    );

    const avgEngagement =
      latestMetric?.avg_engagement_score != null
        ? toSafeNumber(latestMetric.avg_engagement_score)
        : (() => {
            if (sessions.length === 0) return 0;

            let totalScore = 0;

            for (const session of sessions) {
              const sessionId = session.session_id;
              const hasResume = events.some(
                (event) =>
                  event.session_id === sessionId &&
                  event.event_name === RESUME_EVENT
              );
              const hasContact = events.some(
                (event) =>
                  event.session_id === sessionId &&
                  event.event_name === CONTACT_SUCCESS_EVENT
              );
              const hasProjectInterest = events.some(
                (event) =>
                  event.session_id === sessionId &&
                  event.event_name === PROJECT_CLICK_EVENT
              );

              const sectionCount = sectionEngagement
                .filter((row) => row.session_id === sessionId)
                .reduce((set, row) => set.add(row.section_name), new Set<string>())
                .size;

              const sectionTime = sectionEngagement
                .filter((row) => row.session_id === sessionId)
                .reduce(
                  (sum, row) => sum + toSafeNumber(row.time_spent_seconds),
                  0
                );

              let score = 0;
              score += Math.min(toSafeNumber(session.duration_seconds) / 20, 20);
              score += session.is_bounce ? 0 : 10;
              score += Math.min(sectionCount * 5, 20);
              score += Math.min(sectionTime / 6, 20);
              if (hasProjectInterest) score += 10;
              if (hasResume) score += 20;
              if (hasContact) score += 20;

              totalScore += Math.min(100, Math.round(score));
            }

            return totalScore / sessions.length;
          })();

    const returning = visitors.filter(
      (visitor) => toSafeNumber(visitor.total_sessions) > 1
    ).length;

    const frequent = visitors.filter(
      (visitor) => toSafeNumber(visitor.total_sessions) >= 3
    ).length;

    const activeReaders = uniqueEngagedSessions.size;

    const avgActiveSectionTime =
      uniqueEngagedSessions.size > 0
        ? sectionEngagement.reduce(
            (sum, row) => sum + toSafeNumber(row.time_spent_seconds),
            0
          ) / uniqueEngagedSessions.size
        : 0;

    return {
      totalVisitors,
      totalSessions,
      avgDuration,
      bounceRate,
      resumeDownloads,
      contactSubmits,
      totalConversions,
      avgEngagement,
      returning,
      frequent,
      projectClicks,
      activeReaders,
      avgActiveSectionTime,
    };
  }, [metrics, visitors, sessions, events, sectionEngagement]);

  const isLoading =
    metricsLoading ||
    visitorsLoading ||
    sessionsLoading ||
    eventsLoading ||
    sectionLoading;

  const error =
    metricsError ||
    visitorsError ||
    sessionsError ||
    eventsError ||
    sectionError ||
    null;

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
      <KpiCard
        title="Visitors"
        value={formatNumber(kpis.totalVisitors)}
        icon={<Users className="h-4 w-4" />}
        tooltip="Total unique visitors currently available in the analytics dataset."
      />

      <KpiCard
        title="Sessions"
        value={formatNumber(kpis.totalSessions)}
        icon={<Activity className="h-4 w-4" />}
        tooltip="Total browsing sessions recorded across portfolio visits."
      />

      <KpiCard
        title="Avg Duration"
        value={formatDuration(kpis.avgDuration)}
        icon={<Clock className="h-4 w-4" />}
        tooltip="Average session duration across all tracked sessions."
      />

      <KpiCard
        title="Bounce Rate"
        value={formatPercent(kpis.bounceRate)}
        icon={<BarChart3 className="h-4 w-4" />}
        tooltip="Percentage of sessions marked as bounce in the sessions table."
      />

      <KpiCard
        title="Resume Downloads"
        value={formatNumber(kpis.resumeDownloads)}
        icon={<Download className="h-4 w-4" />}
        tooltip="Strong hiring-intent signal from visitors downloading the resume."
      />

      <KpiCard
        title="Contact Submits"
        value={formatNumber(kpis.contactSubmits)}
        icon={<Mail className="h-4 w-4" />}
        tooltip="Successful contact form submissions showing direct outreach intent."
      />

      <KpiCard
        title="Total Conversions"
        value={formatNumber(kpis.totalConversions)}
        icon={<Target className="h-4 w-4" />}
        tooltip="Combined total of resume downloads and successful contact submissions."
      />

      <KpiCard
        title="Avg Engagement"
        value={kpis.avgEngagement.toFixed(0)}
        subtitle="/100"
        icon={<Sparkles className="h-4 w-4" />}
        tooltip="Average engagement score. Uses daily metrics when available, otherwise falls back to derived behavior quality."
      />

      <KpiCard
        title="Returning"
        value={formatNumber(kpis.returning)}
        icon={<Repeat className="h-4 w-4" />}
        tooltip="Visitors who returned for more than one session."
      />

      <KpiCard
        title="Frequent"
        value={formatNumber(kpis.frequent)}
        icon={<Repeat className="h-4 w-4" />}
        tooltip="Visitors with three or more sessions, indicating repeated interest."
      />

      <KpiCard
        title="Project Clicks"
        value={formatNumber(kpis.projectClicks)}
        icon={<MousePointerClick className="h-4 w-4" />}
        tooltip="Total project card interactions, showing portfolio project interest."
      />

      <KpiCard
        title="Active Readers"
        value={formatNumber(kpis.activeReaders)}
        icon={<Map className="h-4 w-4" />}
        tooltip="Sessions with recorded section engagement, indicating real reading behavior."
      />

      <KpiCard
        title="Avg Active Section Time"
        value={formatDuration(kpis.avgActiveSectionTime)}
        icon={<Clock className="h-4 w-4" />}
        tooltip="Average tracked section engagement time across sessions that recorded section reading activity."
      />
    </div>
  );
}