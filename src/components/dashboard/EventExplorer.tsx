import { useMemo, useState } from 'react';
import { LoadingState, ErrorState, EmptyState } from './ChartContainer';
import { useEvents } from '@/hooks/useAnalyticsData';
import { safeParseJSON, formatEventName, timeAgo } from '@/lib/analytics-utils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function EventExplorer() {
  const { data: events, loading, error } = useEvents();
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  const eventTypes = useMemo(() => [...new Set(events.map(e => e.event_name))].sort(), [events]);
  const sections = useMemo(() => [...new Set(events.map(e => e.section).filter(Boolean))].sort(), [events]);

  const filtered = useMemo(() => {
    let result = events;
    if (eventFilter !== 'all') result = result.filter(e => e.event_name === eventFilter);
    if (sectionFilter !== 'all') result = result.filter(e => e.section === sectionFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.event_name.includes(q) || e.visitor_id.includes(q) || e.session_id.includes(q) ||
        (e.section && e.section.includes(q)) || e.properties.toLowerCase().includes(q)
      );
    }
    return result.slice(0, 100);
  }, [events, eventFilter, sectionFilter, search]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <div className="chart-card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <h3 className="text-sm font-semibold shrink-0">Recent Activity Explorer</h3>
          <p className="text-xs text-muted-foreground shrink-0">Events retained ~60-90 days</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs text-sm" />
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-[180px] text-sm"><SelectValue placeholder="All events" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {eventTypes.map(t => <SelectItem key={t} value={t}>{formatEventName(t)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-[160px] text-sm"><SelectValue placeholder="All sections" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map(s => <SelectItem key={s!} value={s!}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? <EmptyState message="No events match filters" /> : (
          <div className="overflow-x-auto scrollbar-thin max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left py-2 px-2 font-medium">Time</th>
                  <th className="text-left py-2 px-2 font-medium">Event</th>
                  <th className="text-left py-2 px-2 font-medium">Section</th>
                  <th className="text-left py-2 px-2 font-medium">Details</th>
                  <th className="text-left py-2 px-2 font-medium">Visitor</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const props = safeParseJSON<Record<string, unknown>>(e.properties, {});
                  const details = extractDetails(e.event_name, props);
                  return (
                    <tr key={e.event_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-2 text-xs text-muted-foreground whitespace-nowrap">{timeAgo(e.created_at)}</td>
                      <td className="py-2 px-2">
                        <span className="analytics-badge bg-primary/10 text-primary">{formatEventName(e.event_name)}</span>
                      </td>
                      <td className="py-2 px-2 text-xs">{e.section || '—'}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground max-w-[300px] truncate">{details}</td>
                      <td className="py-2 px-2 font-mono text-xs text-muted-foreground">{e.visitor_id.slice(0, 8)}…</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">Showing {filtered.length} of {events.length} events (max 100)</p>
      </div>
    </div>
  );
}

function extractDetails(eventName: string, props: Record<string, unknown>): string {
  switch (eventName) {
    case 'nav_click': return `${props.label || ''} → ${props.target || ''}`;
    case 'project_card_click': return `Project: ${props.project_name || 'Unknown'}`;
    case 'social_click': return `${props.platform || ''} (${props.location || ''})`;
    case 'cert_card_click': return `${props.cert_name || ''} by ${props.issuer || ''}`;
    case 'cert_nav_click': return `${props.direction || ''}: ${props.cert_name || ''}`;
    case 'scroll_depth': return `Depth: ${props.depth || 0}%`;
    case 'resume_download': return `Source: ${props.source || 'unknown'}`;
    case 'contact_submit_success': return 'Form submitted successfully';
    case 'contact_submit_attempt': return `Message: ${props.message_len || 0} chars`;
    case 'section_view_end': return `${props.section || ''}: ${props.time_spent_seconds || 0}s`;
    default: return Object.entries(props).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `${k}: ${v}`).join(', ').slice(0, 100);
  }
}
