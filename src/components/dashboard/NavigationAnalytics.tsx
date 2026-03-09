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
import { safeParseJSON, formatSectionName } from '@/lib/analytics-utils';

type NavRow = {
  rawName: string;
  name: string;
  value: number;
};

type NavClickProps = {
  target?: string;
  label?: string;
  location?: string;
};

type SessionNavMeta = {
  firstTarget: string | null;
  firstAt: number;
  allTargets: Set<string>;
  clickCount: number;
};

const NAV_CLICK_EVENT = 'nav_click';

function normalizeNavTarget(props: NavClickProps) {
  const target =
    typeof props.target === 'string' && props.target.trim()
      ? props.target.trim()
      : typeof props.label === 'string' && props.label.trim()
      ? props.label.trim()
      : 'Unknown';

  return target;
}

function sortNavCounts(counts: Record<string, number>): NavRow[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([rawName, value]) => ({
      rawName,
      name: formatSectionName(rawName),
      value,
    }));
}

function safeTime(value: string | null | undefined) {
  const t = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

export function NavigationAnalytics() {
  const { data: events, loading, error } = useEvents();

  const derived = useMemo(() => {
    const targetCounts: Record<string, number> = {};
    const firstIntentCounts: Record<string, number> = {};
    const sessionMap = new Map<string, SessionNavMeta>();

    let totalNavClicks = 0;

    for (const event of events) {
      if (event.event_name !== NAV_CLICK_EVENT) continue;

      totalNavClicks += 1;

      const props = safeParseJSON<NavClickProps>(event.properties, {});
      const target = normalizeNavTarget(props);

      targetCounts[target] = (targetCounts[target] || 0) + 1;

      if (!event.session_id) continue;

      const createdAtMs = safeTime(event.created_at);
      const existing = sessionMap.get(event.session_id);

      if (!existing) {
        sessionMap.set(event.session_id, {
          firstTarget: target,
          firstAt: createdAtMs,
          allTargets: new Set([target]),
          clickCount: 1,
        });
        continue;
      }

      existing.clickCount += 1;
      existing.allTargets.add(target);

      if (createdAtMs < existing.firstAt) {
        existing.firstAt = createdAtMs;
        existing.firstTarget = target;
      }
    }

    for (const session of sessionMap.values()) {
      if (!session.firstTarget) continue;
      firstIntentCounts[session.firstTarget] =
        (firstIntentCounts[session.firstTarget] || 0) + 1;
    }

    const targetData = sortNavCounts(targetCounts);
    const firstIntentData = sortNavCounts(firstIntentCounts);

    const navSessions = sessionMap.size;
    const avgNavClicksPerSession =
      navSessions > 0 ? totalNavClicks / navSessions : 0;

    const multiTargetSessions = Array.from(sessionMap.values()).filter(
      (session) => session.allTargets.size >= 2
    ).length;

    const focusedSessions = Array.from(sessionMap.values()).filter(
      (session) => session.allTargets.size === 1
    ).length;

    const topTarget = targetData[0] ?? null;
    const topFirstIntent = firstIntentData[0] ?? null;

    return {
      targetData,
      firstIntentData,
      totalNavClicks,
      navSessions,
      avgNavClicksPerSession,
      multiTargetSessions,
      focusedSessions,
      topTarget,
      topFirstIntent,
    };
  }, [events]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-4 lg:col-span-2">
        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Nav Clicks
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {derived.totalNavClicks}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Intentional section jumps from the navbar
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Nav Sessions
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {derived.navSessions}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sessions with at least one navbar interaction
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Avg Nav Clicks / Session
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {derived.avgNavClicksPerSession.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Average navigation intensity per engaged session
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Multi-Target Sessions
          </p>
          <p className="mt-1 text-2xl font-bold font-display">
            {derived.multiTargetSessions}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sessions where users navigated to multiple sections
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Top Nav Target
          </p>
          <p className="mt-1 text-xl font-bold font-display text-primary">
            {derived.topTarget ? derived.topTarget.name : '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Most clicked section from navigation
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            First Intent Section
          </p>
          <p className="mt-1 text-xl font-bold font-display text-primary">
            {derived.topFirstIntent ? derived.topFirstIntent.name : '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Most common first section chosen from the navbar
          </p>
        </div>
      </div>

      <ChartContainer
        title="Navbar Click Targets"
        subtitle="Sections visitors intentionally jump to from navigation"
      >
        {derived.targetData.length === 0 ? (
          <EmptyState message="No navigation click data yet" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={derived.targetData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
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
                fill="hsl(var(--chart-6))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      <ChartContainer
        title="First Navigation Intent"
        subtitle="Which section users choose first when they use the navbar"
      >
        {derived.firstIntentData.length === 0 ? (
          <EmptyState message="No first-intent navigation data yet" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={derived.firstIntentData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
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
                formatter={(value: number) => [
                  `${value} sessions`,
                  'First Target',
                ]}
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
        title="Navigation Session Quality"
        subtitle="How focused or exploratory users are when navigating your portfolio"
        className="lg:col-span-2"
      >
        {derived.navSessions === 0 ? (
          <EmptyState message="No navigation session quality data yet" />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Focused Sessions</span>
                <span className="text-sm text-muted-foreground">
                  {derived.focusedSessions}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${(derived.focusedSessions / derived.navSessions) * 100}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Sessions where visitors used navbar navigation for only one
                section, showing a focused intent.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Exploratory Sessions</span>
                <span className="text-sm text-muted-foreground">
                  {derived.multiTargetSessions}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${(derived.multiTargetSessions / derived.navSessions) * 100}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Sessions where visitors used the navbar to inspect multiple
                sections, showing broader exploration.
              </p>
            </div>
          </div>
        )}
      </ChartContainer>
    </div>
  );
}