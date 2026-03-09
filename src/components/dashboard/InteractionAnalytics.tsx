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
import { useEvents } from '@/hooks/useAnalyticsData';
import { safeParseJSON } from '@/lib/analytics-utils';

type CountRow = {
  name: string;
  value: number;
};

const EVENT_PROJECT_CLICK = 'project_card_click';
const EVENT_SOCIAL_CLICK = 'social_click';
const EVENT_CERT_CLICK = 'cert_card_click';
const EVENT_CERT_NAV_CLICK = 'cert_nav_click';

function toTitleCase(value: string) {
  if (!value) return value;

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function sortCountMap(map: Record<string, number>): CountRow[] {
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function increment(
  map: Record<string, number>,
  key: string | null | undefined
) {
  if (!key) return;

  const normalized = String(key).trim();
  if (!normalized) return;

  map[normalized] = (map[normalized] || 0) + 1;
}

function shortSessionId(sessionId: string | null | undefined) {
  if (!sessionId) return 'Unknown';
  return `${sessionId.slice(0, 8)}…`;
}

export function ProjectAnalytics() {
  const { data: events, loading, error } = useEvents();

  const derived = useMemo(() => {
    const projectCounts: Record<string, number> = {};
    const projectsBySession = new Map<string, Set<string>>();
    const projectsByVisitor = new Map<string, Set<string>>();

    let totalProjectClicks = 0;

    for (const event of events) {
      if (event.event_name !== EVENT_PROJECT_CLICK) continue;

      totalProjectClicks += 1;

      const props = safeParseJSON<Record<string, unknown>>(event.properties, {});
      const projectName =
        typeof props.project_name === 'string' ? props.project_name.trim() : '';

      if (!projectName) continue;

      increment(projectCounts, projectName);

      if (event.session_id) {
        const existingSessionProjects =
          projectsBySession.get(event.session_id) ?? new Set<string>();
        existingSessionProjects.add(projectName);
        projectsBySession.set(event.session_id, existingSessionProjects);
      }

      if (event.visitor_id) {
        const existingVisitorProjects =
          projectsByVisitor.get(event.visitor_id) ?? new Set<string>();
        existingVisitorProjects.add(projectName);
        projectsByVisitor.set(event.visitor_id, existingVisitorProjects);
      }
    }

    const projectData = sortCountMap(projectCounts);
    const topProject = projectData[0] ?? null;

    const sessionsWithProjectEngagement = projectsBySession.size;
    const visitorsWithProjectEngagement = projectsByVisitor.size;

    const avgProjectsPerInterestedSession =
      sessionsWithProjectEngagement > 0
        ? Array.from(projectsBySession.values()).reduce(
            (sum, set) => sum + set.size,
            0
          ) / sessionsWithProjectEngagement
        : 0;

    const avgProjectsPerInterestedVisitor =
      visitorsWithProjectEngagement > 0
        ? Array.from(projectsByVisitor.values()).reduce(
            (sum, set) => sum + set.size,
            0
          ) / visitorsWithProjectEngagement
        : 0;

    const sessionExplorationData = Array.from(projectsBySession.entries())
      .map(([sessionId, projectSet]) => ({
        name: shortSessionId(sessionId),
        value: projectSet.size,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      projectData,
      totalProjectClicks,
      topProject,
      sessionsWithProjectEngagement,
      visitorsWithProjectEngagement,
      avgProjectsPerInterestedSession,
      avgProjectsPerInterestedVisitor,
      sessionExplorationData,
    };
  }, [events]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Project Clicks
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {derived.totalProjectClicks}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Total project openings across all sessions
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Project Exploration Depth
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {derived.avgProjectsPerInterestedVisitor.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Average unique projects viewed per interested visitor
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Interested Visitors
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {derived.visitorsWithProjectEngagement}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Visitors who explored at least one project
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Avg Projects per Session
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {derived.avgProjectsPerInterestedSession.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Average unique projects explored in engaged sessions
          </p>
        </div>

        <div className="col-span-2 kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Most Interesting Project
          </p>
          <p className="mt-1 text-xl font-bold font-display text-primary">
            {derived.topProject ? derived.topProject.name : '—'}
          </p>
          {derived.topProject ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {derived.topProject.value} click
              {derived.topProject.value === 1 ? '' : 's'} — highest recruiter
              interest
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              No project interaction data available yet
            </p>
          )}
        </div>
      </div>

      <ChartContainer
        title="Project Interest Ranking"
        subtitle="Projects attracting the most attention"
      >
        {derived.projectData.length === 0 ? (
          <EmptyState message="No project click data yet" />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={derived.projectData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
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
                formatter={(value: number) => [`${value} clicks`, 'Clicks']}
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
        title="Project Exploration by Session"
        subtitle="How many different projects visitors explored per session"
        className="lg:col-span-2"
      >
        {derived.sessionExplorationData.length === 0 ? (
          <EmptyState message="No project exploration data yet" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={derived.sessionExplorationData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [
                  `${value} unique project${value === 1 ? '' : 's'}`,
                  'Exploration Depth',
                ]}
              />
              <Bar
                dataKey="value"
                fill="hsl(var(--chart-6))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    </div>
  );
}

export function SocialAnalytics() {
  const { data: events, loading, error } = useEvents();

  const derived = useMemo(() => {
    const socialCounts: Record<string, number> = {};
    let totalSocialClicks = 0;

    for (const event of events) {
      if (event.event_name !== EVENT_SOCIAL_CLICK) continue;

      totalSocialClicks += 1;

      const props = safeParseJSON<Record<string, unknown>>(
        event.properties,
        {}
      );

      const platform =
        typeof props.platform === 'string' ? toTitleCase(props.platform) : null;

      increment(socialCounts, platform);
    }

    const socialData = sortCountMap(socialCounts);
    const topPlatform = socialData[0] ?? null;

    return {
      socialData,
      totalSocialClicks,
      topPlatform,
    };
  }, [events]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Social Clicks
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {derived.totalSocialClicks}
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Top Platform
          </p>
          <p className="mt-1 text-xl font-bold font-display text-primary">
            {derived.topPlatform ? derived.topPlatform.name : '—'}
          </p>
        </div>
      </div>

      <ChartContainer
        title="Social Platform Ranking"
        subtitle="Which social profiles visitors check most"
      >
        {derived.socialData.length === 0 ? (
          <EmptyState message="No social click data yet" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={derived.socialData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
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
                formatter={(value: number) => [`${value} clicks`, 'Clicks']}
              />
              <Bar
                dataKey="value"
                fill="hsl(var(--chart-5))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    </div>
  );
}

export function CertificationAnalytics() {
  const { data: events, loading, error } = useEvents();

  const derived = useMemo(() => {
    const certClickCounts: Record<string, number> = {};
    const issuerClickCounts: Record<string, number> = {};
    const navClicksBySession: Record<string, number> = {};

    let totalCertClicks = 0;
    let totalCertNavClicks = 0;

    for (const event of events) {
      if (event.event_name === EVENT_CERT_CLICK) {
        totalCertClicks += 1;

        const props = safeParseJSON<Record<string, unknown>>(
          event.properties,
          {}
        );

        const certName =
          typeof props.cert_name === 'string' ? props.cert_name : null;
        const issuer =
          typeof props.issuer === 'string' ? props.issuer : null;

        increment(certClickCounts, certName);
        increment(issuerClickCounts, issuer);
      }

      if (event.event_name === EVENT_CERT_NAV_CLICK) {
        totalCertNavClicks += 1;

        if (event.session_id) {
          navClicksBySession[event.session_id] =
            (navClicksBySession[event.session_id] || 0) + 1;
        }
      }
    }

    const certData = sortCountMap(certClickCounts);
    const issuerData = sortCountMap(issuerClickCounts);

    const browsingSessionData = Object.entries(navClicksBySession)
      .map(([sessionId, value]) => ({
        name: shortSessionId(sessionId),
        value,
      }))
      .sort((a, b) => b.value - a.value);

    const browsingSessions = browsingSessionData.length;
    const avgNavClicksPerBrowsingSession =
      browsingSessions > 0 ? totalCertNavClicks / browsingSessions : 0;

    return {
      certData,
      issuerData,
      browsingSessionData,
      totalCertClicks,
      totalCertNavClicks,
      browsingSessions,
      avgNavClicksPerBrowsingSession,
      topCert: certData[0] ?? null,
      topIssuer: issuerData[0] ?? null,
    };
  }, [events]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Cert Clicks
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {derived.totalCertClicks}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Direct certificate opens
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Cert Nav Clicks
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {derived.totalCertNavClicks}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Browsing and searching behavior
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Top Certificate
          </p>
          <p className="mt-1 text-sm font-bold font-display text-primary">
            {derived.topCert ? derived.topCert.name : '—'}
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Top Issuer
          </p>
          <p className="mt-1 text-sm font-bold font-display text-primary">
            {derived.topIssuer ? derived.topIssuer.name : '—'}
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Browsing Sessions
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {derived.browsingSessions}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sessions with certificate navigation activity
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Avg Browsing Depth
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {derived.avgNavClicksPerBrowsingSession.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Average cert nav clicks per browsing session
          </p>
        </div>
      </div>

      <ChartContainer
        title="Certification Interest"
        subtitle="Direct clicks by certificate name"
      >
        {derived.certData.length === 0 ? (
          <EmptyState message="No direct certification click data yet" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={derived.certData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={180}
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [`${value} clicks`, 'Clicks']}
              />
              <Bar
                dataKey="value"
                fill="hsl(var(--chart-4))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer
        title="Certification Browsing Depth by Session"
        subtitle="How intensively visitors browse certifications within a session"
        className="lg:col-span-2"
      >
        {derived.browsingSessionData.length === 0 ? (
          <EmptyState message="No certification browsing activity yet" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={derived.browsingSessionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [
                  `${value} nav clicks`,
                  'Browsing Depth',
                ]}
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
    </div>
  );
}