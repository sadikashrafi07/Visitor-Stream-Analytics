import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, EmptyState, LoadingState, ErrorState } from './ChartContainer';
import { useSessionAnalytics } from '@/hooks/useAnalyticsData';
import { aggregateJsonCounts, sortedEntries } from '@/lib/analytics-utils';

export function ProjectAnalytics() {
  const { data: sessions, loading, error } = useSessionAnalytics();

  const projectData = useMemo(() => {
    const counts = aggregateJsonCounts(sessions.map(s => s.project_clicks_by_name));
    return sortedEntries(counts).map(([name, value]) => ({ name, value }));
  }, [sessions]);

  const totalProjectClicks = useMemo(() => sessions.reduce((s, x) => s + x.project_clicks, 0), [sessions]);
  const totalGithubClicks = useMemo(() => sessions.reduce((s, x) => s + x.github_clicks, 0), [sessions]);
  const topProject = projectData[0];

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="kpi-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Project Clicks</p>
          <p className="text-2xl font-display font-bold mt-1">{totalProjectClicks}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">GitHub Clicks</p>
          <p className="text-2xl font-display font-bold mt-1">{totalGithubClicks}</p>
        </div>
        <div className="kpi-card col-span-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Most Interesting Project</p>
          <p className="text-xl font-display font-bold mt-1 text-primary">{topProject ? topProject.name : '—'}</p>
          {topProject && <p className="text-xs text-muted-foreground mt-1">{topProject.value} clicks — highest recruiter interest</p>}
        </div>
      </div>

      <ChartContainer title="Project Interest Ranking" subtitle="Which projects attract the most clicks">
        {projectData.length === 0 ? <EmptyState message="No project click data yet" /> : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={projectData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    </div>
  );
}

export function SocialAnalytics() {
  const { data: sessions, loading, error } = useSessionAnalytics();

  const socialData = useMemo(() => {
    const counts = aggregateJsonCounts(sessions.map(s => s.social_clicks_by_platform));
    return sortedEntries(counts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [sessions]);

  const totalSocial = useMemo(() => sessions.reduce((s, x) => s + x.social_clicks, 0), [sessions]);
  const topPlatform = socialData[0];

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="kpi-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Social Clicks</p>
          <p className="text-2xl font-display font-bold mt-1">{totalSocial}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Top Platform</p>
          <p className="text-xl font-display font-bold mt-1 text-primary">{topPlatform ? topPlatform.name : '—'}</p>
        </div>
      </div>

      <ChartContainer title="Social Platform Ranking" subtitle="Which social profiles visitors check">
        {socialData.length === 0 ? <EmptyState message="No social click data yet" /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={socialData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    </div>
  );
}

export function CertificationAnalytics() {
  const { data: sessions, loading, error } = useSessionAnalytics();

  const certData = useMemo(() => {
    const counts = aggregateJsonCounts(sessions.map(s => s.cert_clicks_by_name));
    return sortedEntries(counts).map(([name, value]) => ({ name, value }));
  }, [sessions]);

  const issuerData = useMemo(() => {
    const counts = aggregateJsonCounts(sessions.map(s => s.cert_clicks_by_issuer));
    return sortedEntries(counts).map(([name, value]) => ({ name, value }));
  }, [sessions]);

  const totalCertClicks = useMemo(() => sessions.reduce((s, x) => s + x.cert_clicks, 0), [sessions]);
  const totalCertNavClicks = useMemo(() => sessions.reduce((s, x) => s + x.cert_nav_clicks, 0), [sessions]);
  const topCert = certData[0];
  const topIssuer = issuerData[0];

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="kpi-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Cert Clicks</p>
          <p className="text-2xl font-display font-bold mt-1">{totalCertClicks}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Cert Nav Clicks</p>
          <p className="text-2xl font-display font-bold mt-1">{totalCertNavClicks}</p>
          <p className="text-xs text-muted-foreground mt-1">Exploration / curiosity signal</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Top Certificate</p>
          <p className="text-sm font-display font-bold mt-1 text-primary">{topCert ? topCert.name : '—'}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Top Issuer</p>
          <p className="text-sm font-display font-bold mt-1 text-primary">{topIssuer ? topIssuer.name : '—'}</p>
        </div>
      </div>

      <ChartContainer title="Certification Interest" subtitle="Clicks by certificate name">
        {certData.length === 0 ? <EmptyState message="No cert click data yet" /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={certData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    </div>
  );
}
