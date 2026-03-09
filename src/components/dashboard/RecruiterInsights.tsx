import { useMemo } from 'react';
import { LoadingState, ErrorState } from './ChartContainer';
import { useVisitors, useSessionAnalytics, useSectionEngagement, useEvents } from '@/hooks/useAnalyticsData';
import { aggregateJsonCounts, sortedEntries, formatSectionName, formatDuration, safeParseJSON } from '@/lib/analytics-utils';

export function RecruiterInsights() {
  const { data: visitors, loading: vl } = useVisitors();
  const { data: sessions, loading: sl } = useSessionAnalytics();
  const { data: sectionData, loading: sel } = useSectionEngagement();
  const { data: events, loading: el } = useEvents();

  const insights = useMemo(() => {
    if (!visitors.length && !sessions.length) return [];
    const lines: { emoji: string; text: string; category: string }[] = [];

    // Section insights
    const sectionMap: Record<string, { total: number; count: number }> = {};
    sectionData.forEach(s => {
      if (!sectionMap[s.section_name]) sectionMap[s.section_name] = { total: 0, count: 0 };
      sectionMap[s.section_name].total += s.time_spent_seconds;
      sectionMap[s.section_name].count++;
    });
    const sectionsByTime = Object.entries(sectionMap).sort((a, b) => b[1].total - a[1].total);
    const sectionsByViews = Object.entries(sectionMap).sort((a, b) => b[1].count - a[1].count);

    if (sectionsByViews[0]) {
      lines.push({ emoji: '👁️', text: `The most visited section is **${formatSectionName(sectionsByViews[0][0])}** with ${sectionsByViews[0][1].count} views.`, category: 'Section' });
    }
    if (sectionsByTime[0]) {
      lines.push({ emoji: '⏱️', text: `Visitors spend the most time on **${formatSectionName(sectionsByTime[0][0])}** (${formatDuration(sectionsByTime[0][1].total)} total).`, category: 'Section' });
    }

    // Project insights
    const projectCounts = aggregateJsonCounts(sessions.map(s => s.project_clicks_by_name));
    const topProject = sortedEntries(projectCounts)[0];
    if (topProject) {
      lines.push({ emoji: '🚀', text: `**${topProject[0]}** is the most interesting project with ${topProject[1]} click${topProject[1] > 1 ? 's' : ''} — indicates strong recruiter interest.`, category: 'Projects' });
    }

    // Social insights
    const socialCounts = aggregateJsonCounts(sessions.map(s => s.social_clicks_by_platform));
    const topSocial = sortedEntries(socialCounts)[0];
    if (topSocial) {
      lines.push({ emoji: '🔗', text: `**${topSocial[0].charAt(0).toUpperCase() + topSocial[0].slice(1)}** is the most clicked social platform (${topSocial[1]} clicks).`, category: 'Social' });
    }

    // Cert insights
    const certCounts = aggregateJsonCounts(sessions.map(s => s.cert_clicks_by_name));
    const topCert = sortedEntries(certCounts)[0];
    const totalCertNav = sessions.reduce((s, x) => s + x.cert_nav_clicks, 0);
    if (topCert) {
      lines.push({ emoji: '🏅', text: `**${topCert[0]}** is the most interesting certification. ${totalCertNav} certification navigation clicks show deep exploration interest.`, category: 'Certifications' });
    }

    // Nav insights
    const navEvents = events.filter(e => e.event_name === 'nav_click');
    const navCounts: Record<string, number> = {};
    navEvents.forEach(e => {
      const props = safeParseJSON<Record<string, string>>(e.properties, {});
      const target = props.target || props.label || '';
      if (target) navCounts[target] = (navCounts[target] || 0) + 1;
    });
    const topNav = sortedEntries(navCounts)[0];
    if (topNav) {
      lines.push({ emoji: '🧭', text: `**${formatSectionName(topNav[0])}** is the most clicked navbar target — visitors actively seek this section.`, category: 'Navigation' });
    }

    // Source insights
    const sourceCounts: Record<string, number> = {};
    visitors.forEach(v => { const s = v.referrer || v.first_utm_source || 'Direct'; sourceCounts[s] = (sourceCounts[s] || 0) + 1; });
    const topSource = sortedEntries(sourceCounts)[0];
    if (topSource) {
      lines.push({ emoji: '📡', text: `The primary traffic source is **${topSource[0]}** (${topSource[1]} visitor${topSource[1] > 1 ? 's' : ''}).`, category: 'Traffic' });
    }

    // Conversion insights
    const resumeTotal = sessions.reduce((s, x) => s + x.resume_downloads, 0);
    const contactTotal = sessions.reduce((s, x) => s + x.contact_submits, 0);
    if (resumeTotal > 0) {
      lines.push({ emoji: '📄', text: `**${resumeTotal} resume download${resumeTotal > 1 ? 's'  : ''}** recorded — this is the strongest hiring-intent signal.`, category: 'Conversions' });
    }
    if (contactTotal > 0) {
      lines.push({ emoji: '✉️', text: `**${contactTotal} contact form submission${contactTotal > 1 ? 's' : ''}** — direct recruiter outreach detected.`, category: 'Conversions' });
    }

    // Returning visitors
    const returning = visitors.filter(v => v.total_sessions > 1).length;
    if (returning > 0) {
      lines.push({ emoji: '🔁', text: `**${returning} returning visitor${returning > 1 ? 's' : ''}** — your portfolio is memorable enough to bring people back.`, category: 'Retention' });
    }

    // Engagement
    const avgEngagement = sessions.length > 0 ? sessions.reduce((s, x) => s + x.engagement_score, 0) / sessions.length : 0;
    const highEngagement = sessions.filter(s => s.engagement_score >= 50).length;
    if (highEngagement > 0) {
      lines.push({ emoji: '🔥', text: `**${highEngagement} high-engagement session${highEngagement > 1 ? 's' : ''}** (score ≥ 50) with average engagement of **${avgEngagement.toFixed(0)}/100**.`, category: 'Engagement' });
    }

    // Countries
    const countries = [...new Set(visitors.map(v => v.country).filter(Boolean))];
    if (countries.length > 0) {
      lines.push({ emoji: '🌍', text: `Visitors from **${countries.length} ${countries.length === 1 ? 'country' : 'countries'}**: ${countries.slice(0, 5).join(', ')}${countries.length > 5 ? '...' : ''}.`, category: 'Audience' });
    }

    return lines;
  }, [visitors, sessions, sectionData, events]);

  if (vl || sl || sel || el) return <LoadingState />;
  if (insights.length === 0) return <div className="insight-card"><p className="text-sm text-muted-foreground">Not enough data to generate insights yet.</p></div>;

  return (
    <div className="space-y-4">
      <div className="insight-card">
        <h3 className="text-lg font-display font-bold mb-1">Recruiter Interest Insights</h3>
        <p className="text-xs text-muted-foreground mb-4">Executive summary of visitor behavior and hiring signals</p>
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="text-lg shrink-0">{insight.emoji}</span>
              <div>
                <span className="analytics-badge bg-muted text-muted-foreground mb-1">{insight.category}</span>
                <p className="text-sm text-foreground mt-1" dangerouslySetInnerHTML={{ __html: insight.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
