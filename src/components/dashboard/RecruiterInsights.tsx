import { useMemo } from 'react';
import { LoadingState, ErrorState } from './ChartContainer';
import {
  useVisitors,
  useSectionEngagement,
  useEvents,
  useDailyMetrics,
} from '@/hooks/useAnalyticsData';
import {
  formatSectionName,
  formatDuration,
  safeParseJSON,
} from '@/lib/analytics-utils';

type Insight = {
  emoji: string;
  category: string;
  text: React.ReactNode;
};

const EVENT_PROJECT_CLICK = 'project_card_click';
const EVENT_SOCIAL_CLICK = 'social_click';
const EVENT_CERT_CLICK = 'cert_card_click';
const EVENT_CERT_NAV_CLICK = 'cert_nav_click';
const EVENT_NAV_CLICK = 'nav_click';
const EVENT_RESUME_DOWNLOAD = 'resume_download';
const EVENT_CONTACT_SUCCESS = 'contact_submit_success';

function sortCountEntries(obj: Record<string, number>) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

function increment(map: Record<string, number>, key: string | null | undefined) {
  if (!key) return;
  const normalized = String(key).trim();
  if (!normalized) return;
  map[normalized] = (map[normalized] || 0) + 1;
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function RecruiterInsights() {
  const {
    data: visitors,
    loading: visitorsLoading,
    error: visitorsError,
  } = useVisitors();

  const {
    data: sectionData,
    loading: sectionLoading,
    error: sectionError,
  } = useSectionEngagement();

  const {
    data: events,
    loading: eventsLoading,
    error: eventsError,
  } = useEvents();

  const {
    data: dailyMetrics,
    loading: metricsLoading,
    error: metricsError,
  } = useDailyMetrics();

  const insights = useMemo<Insight[]>(() => {
    if (
      visitors.length === 0 &&
      sectionData.length === 0 &&
      events.length === 0 &&
      dailyMetrics.length === 0
    ) {
      return [];
    }

    const lines: Insight[] = [];

    // Section insights
    const sectionMap: Record<string, { total: number; count: number }> = {};

    for (const row of sectionData) {
      if (!sectionMap[row.section_name]) {
        sectionMap[row.section_name] = { total: 0, count: 0 };
      }

      sectionMap[row.section_name].total += row.time_spent_seconds;
      sectionMap[row.section_name].count += 1;
    }

    const sectionsByTime = Object.entries(sectionMap).sort(
      (a, b) => b[1].total - a[1].total
    );
    const sectionsByViews = Object.entries(sectionMap).sort(
      (a, b) => b[1].count - a[1].count
    );

    if (sectionsByViews[0]) {
      lines.push({
        emoji: '👁️',
        category: 'Section',
        text: (
          <>
            The most visited section is{' '}
            <strong>{formatSectionName(sectionsByViews[0][0])}</strong> with{' '}
            <strong>{sectionsByViews[0][1].count}</strong> recorded views.
          </>
        ),
      });
    }

    if (sectionsByTime[0]) {
      lines.push({
        emoji: '⏱️',
        category: 'Section',
        text: (
          <>
            Visitors spend the most time on{' '}
            <strong>{formatSectionName(sectionsByTime[0][0])}</strong> with{' '}
            <strong>{formatDuration(sectionsByTime[0][1].total)}</strong> total
            engagement time.
          </>
        ),
      });
    }

    // Project insights from events
    const projectCounts: Record<string, number> = {};
    const socialCounts: Record<string, number> = {};
    const certCounts: Record<string, number> = {};
    const navCounts: Record<string, number> = {};

    let totalCertNav = 0;
    let resumeTotal = 0;
    let contactTotal = 0;

    for (const event of events) {
      const props = safeParseJSON<Record<string, unknown>>(event.properties, {});

      if (event.event_name === EVENT_PROJECT_CLICK) {
        const projectName =
          typeof props.project_name === 'string' ? props.project_name : null;
        increment(projectCounts, projectName);
      }

      if (event.event_name === EVENT_SOCIAL_CLICK) {
        const platform =
          typeof props.platform === 'string'
            ? capitalize(props.platform)
            : null;
        increment(socialCounts, platform);
      }

      if (event.event_name === EVENT_CERT_CLICK) {
        const certName =
          typeof props.cert_name === 'string' ? props.cert_name : null;
        increment(certCounts, certName);
      }

      if (event.event_name === EVENT_CERT_NAV_CLICK) {
        totalCertNav += 1;

        const certName =
          typeof props.cert_name === 'string' ? props.cert_name : null;
        increment(certCounts, certName);
      }

      if (event.event_name === EVENT_NAV_CLICK) {
        const target =
          typeof props.target === 'string'
            ? props.target
            : typeof props.label === 'string'
            ? props.label
            : null;
        increment(navCounts, target);
      }

      if (event.event_name === EVENT_RESUME_DOWNLOAD) {
        resumeTotal += 1;
      }

      if (event.event_name === EVENT_CONTACT_SUCCESS) {
        contactTotal += 1;
      }
    }

    const topProject = sortCountEntries(projectCounts)[0];
    const topSocial = sortCountEntries(socialCounts)[0];
    const topCert = sortCountEntries(certCounts)[0];
    const topNav = sortCountEntries(navCounts)[0];

    if (topProject) {
      lines.push({
        emoji: '🚀',
        category: 'Projects',
        text: (
          <>
            <strong>{topProject[0]}</strong> is the most interesting project with{' '}
            <strong>{topProject[1]}</strong> click{topProject[1] > 1 ? 's' : ''},
            indicating the strongest project-level recruiter interest.
          </>
        ),
      });
    }

    if (topSocial) {
      lines.push({
        emoji: '🔗',
        category: 'Social',
        text: (
          <>
            <strong>{topSocial[0]}</strong> is the most clicked social platform
            with <strong>{topSocial[1]}</strong> click
            {topSocial[1] > 1 ? 's' : ''}.
          </>
        ),
      });
    }

    if (topCert) {
      lines.push({
        emoji: '🏅',
        category: 'Certifications',
        text: (
          <>
            <strong>{topCert[0]}</strong> is the most interesting certification.
            There were <strong>{totalCertNav}</strong> certification navigation
            click{totalCertNav > 1 ? 's' : ''}, which suggests deeper exploration
            of your credentials.
          </>
        ),
      });
    }

    if (topNav) {
      lines.push({
        emoji: '🧭',
        category: 'Navigation',
        text: (
          <>
            <strong>{formatSectionName(topNav[0])}</strong> is the most clicked
            navbar target, showing that visitors intentionally seek this section
            first.
          </>
        ),
      });
    }

    // Source / traffic insights
    const sourceCounts: Record<string, number> = {};

    for (const visitor of visitors) {
      const source =
        visitor.first_utm_source ||
        visitor.referrer ||
        'Direct';

      increment(sourceCounts, source);
    }

    const topSource = sortCountEntries(sourceCounts)[0];

    if (topSource) {
      lines.push({
        emoji: '📡',
        category: 'Traffic',
        text: (
          <>
            The primary acquisition source is <strong>{topSource[0]}</strong> with{' '}
            <strong>{topSource[1]}</strong> visitor
            {topSource[1] > 1 ? 's' : ''}.
          </>
        ),
      });
    }

    // Conversion insights
    if (resumeTotal > 0) {
      lines.push({
        emoji: '📄',
        category: 'Conversions',
        text: (
          <>
            <strong>{resumeTotal}</strong> resume download
            {resumeTotal > 1 ? 's' : ''} recorded — this is one of the strongest
            hiring-intent signals in the portfolio funnel.
          </>
        ),
      });
    }

    if (contactTotal > 0) {
      lines.push({
        emoji: '✉️',
        category: 'Conversions',
        text: (
          <>
            <strong>{contactTotal}</strong> contact form submission
            {contactTotal > 1 ? 's' : ''} recorded — a clear indicator of direct
            recruiter or hiring-team interest.
          </>
        ),
      });
    }

    // Returning visitors
    const returning = visitors.filter((visitor) => visitor.total_sessions > 1).length;

    if (returning > 0) {
      lines.push({
        emoji: '🔁',
        category: 'Retention',
        text: (
          <>
            <strong>{returning}</strong> returning visitor
            {returning > 1 ? 's' : ''} came back for another session, suggesting
            your portfolio creates lasting interest.
          </>
        ),
      });
    }

    // Engagement score from daily metrics
    const latestMetric = dailyMetrics.length
      ? dailyMetrics[dailyMetrics.length - 1]
      : null;

    if (latestMetric) {
      const avgEngagement =
        parseFloat(String(latestMetric.avg_engagement_score)) || 0;

      const totalConversions =
        Number(latestMetric.total_conversions) || 0;

      lines.push({
        emoji: '🔥',
        category: 'Engagement',
        text: (
          <>
            The latest average engagement score is{' '}
            <strong>{avgEngagement.toFixed(0)}/100</strong>, with{' '}
            <strong>{totalConversions}</strong> conversion action
            {totalConversions > 1 ? 's' : ''} recorded for that day.
          </>
        ),
      });
    }

    // Audience geography
    const countries = [...new Set(visitors.map((v) => v.country).filter(Boolean))];

    if (countries.length > 0) {
      lines.push({
        emoji: '🌍',
        category: 'Audience',
        text: (
          <>
            Visitors have come from <strong>{countries.length}</strong>{' '}
            countr{countries.length === 1 ? 'y' : 'ies'} including{' '}
            <strong>{countries.slice(0, 5).join(', ')}</strong>
            {countries.length > 5 ? ' and more' : ''}.
          </>
        ),
      });
    }

    return lines;
  }, [visitors, sectionData, events, dailyMetrics]);

  const isLoading =
    visitorsLoading || sectionLoading || eventsLoading || metricsLoading;

  const error =
    visitorsError || sectionError || eventsError || metricsError || null;

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  if (insights.length === 0) {
    return (
      <div className="insight-card">
        <p className="text-sm text-muted-foreground">
          Not enough data to generate recruiter insights yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="insight-card">
        <h3 className="mb-1 text-lg font-bold font-display">
          Recruiter Interest Insights
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Executive summary of visitor behavior and hiring-intent signals
        </p>

        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div key={`${insight.category}-${index}`} className="flex items-start gap-3">
              <span className="shrink-0 text-lg" aria-hidden="true">
                {insight.emoji}
              </span>

              <div>
                <span className="analytics-badge mb-1 bg-muted text-muted-foreground">
                  {insight.category}
                </span>
                <div className="mt-1 text-sm text-foreground">
                  {insight.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}