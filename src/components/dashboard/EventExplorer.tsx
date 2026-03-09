import { useMemo, useState } from 'react';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  ChartContainer,
} from './ChartContainer';
import { useEvents } from '@/hooks/useAnalyticsData';
import {
  safeParseJSON,
  formatEventName,
  formatSectionName,
  timeAgo,
} from '@/lib/analytics-utils';
import type { AnalyticsEvent } from '@/lib/types';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MAX_ROWS = 100;

export function EventExplorer() {
  const { data: events, loading, error } = useEvents();

  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  const eventTypes = useMemo(
    () => [...new Set(events.map((e) => e.event_name))].sort(),
    [events]
  );

  const sections = useMemo(
    () =>
      [...new Set(events.map((e) => e.section).filter(Boolean as unknown as <T>(value: T | null | undefined) => value is T))]
        .sort(),
    [events]
  );

  const filtered = useMemo(() => {
    let result = events;

    if (eventFilter !== 'all') {
      result = result.filter((e) => e.event_name === eventFilter);
    }

    if (sectionFilter !== 'all') {
      result = result.filter((e) => e.section === sectionFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();

      result = result.filter((e) => {
        const propertiesText =
          typeof e.properties === 'string' ? e.properties.toLowerCase() : '';

        return (
          e.event_name.toLowerCase().includes(q) ||
          e.visitor_id.toLowerCase().includes(q) ||
          e.session_id.toLowerCase().includes(q) ||
          (e.section ? e.section.toLowerCase().includes(q) : false) ||
          propertiesText.includes(q)
        );
      });
    }

    return result.slice(0, MAX_ROWS);
  }, [events, eventFilter, sectionFilter, search]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <ChartContainer
      title="Recent Activity Explorer"
      subtitle="Recent event stream from portfolio interactions. Raw events are retained for approximately 60–90 days."
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Input
          placeholder="Search by event, visitor, session, section, or properties..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm text-sm"
        />

        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-[200px] text-sm">
            <SelectValue placeholder="All events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {eventTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {formatEventName(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger className="w-[180px] text-sm">
            <SelectValue placeholder="All sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sections.map((section) => (
              <SelectItem key={section} value={section}>
                {formatSectionName(section)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No events match the current filters" />
      ) : (
        <>
          <div className="max-h-[500px] overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Time</th>
                  <th className="px-3 py-2 text-left font-medium">Event</th>
                  <th className="px-3 py-2 text-left font-medium">Section</th>
                  <th className="px-3 py-2 text-left font-medium">Details</th>
                  <th className="px-3 py-2 text-left font-medium">Visitor</th>
                  <th className="px-3 py-2 text-left font-medium">Session</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((event) => {
                  const props = safeParseJSON<Record<string, unknown>>(
                    event.properties,
                    {}
                  );
                  const details = extractDetails(event, props);

                  return (
                    <tr
                      key={event.event_id}
                      className="border-b border-border/50 transition-colors hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                        {timeAgo(event.created_at)}
                      </td>

                      <td className="px-3 py-2">
                        <span className="analytics-badge bg-primary/10 text-primary">
                          {formatEventName(event.event_name)}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-xs">
                        {event.section ? formatSectionName(event.section) : '—'}
                      </td>

                      <td
                        className="max-w-[360px] truncate px-3 py-2 text-xs text-muted-foreground"
                        title={details}
                      >
                        {details || '—'}
                      </td>

                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {shortId(event.visitor_id)}
                      </td>

                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {shortId(event.session_id)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Showing {filtered.length} of {events.length} events (maximum {MAX_ROWS}{' '}
            rows rendered for performance).
          </p>
        </>
      )}
    </ChartContainer>
  );
}

function shortId(value: string | null | undefined) {
  if (!value) return '—';
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}

function extractDetails(
  event: AnalyticsEvent,
  props: Record<string, unknown>
): string {
  switch (event.event_name) {
    case 'nav_click':
      return joinParts([
        props.label ? String(props.label) : null,
        props.target ? `→ ${String(props.target)}` : null,
        props.location ? `(${String(props.location)})` : null,
      ]);

    case 'project_card_click':
      return joinParts([
        props.project_name ? `Project: ${String(props.project_name)}` : null,
        props.method ? `Method: ${String(props.method)}` : null,
        props.position !== undefined ? `Position: ${String(props.position)}` : null,
      ]);

    case 'social_click':
      return joinParts([
        props.platform ? `Platform: ${String(props.platform)}` : null,
        props.location ? `Location: ${String(props.location)}` : null,
      ]);

    case 'cert_card_click':
      return joinParts([
        props.cert_name ? String(props.cert_name) : null,
        props.issuer ? `by ${String(props.issuer)}` : null,
      ]);

    case 'cert_nav_click':
      return joinParts([
        props.direction ? `Direction: ${String(props.direction)}` : null,
        props.cert_name ? `Cert: ${String(props.cert_name)}` : null,
        props.issuer ? `Issuer: ${String(props.issuer)}` : null,
      ]);

    case 'scroll_depth':
      return `Depth: ${String(props.depth ?? 0)}%`;

    case 'scroll_to_top':
      return joinParts([
        props.scroll_position !== undefined
          ? `From position: ${String(props.scroll_position)}`
          : null,
      ]);

    case 'resume_download':
      return `Source: ${String(props.source ?? 'unknown')}`;

    case 'contact_submit_success':
      return 'Contact form submitted successfully';

    case 'contact_submit_attempt':
      return joinParts([
        props.message_len !== undefined
          ? `Message: ${String(props.message_len)} chars`
          : null,
        props.subject_len !== undefined
          ? `Subject: ${String(props.subject_len)} chars`
          : null,
      ]);

    case 'contact_submit_failure':
      return joinParts([
        props.status ? `Status: ${String(props.status)}` : null,
        props.reason ? `Reason: ${String(props.reason)}` : null,
      ]);

    case 'section_view_end':
      return joinParts([
        props.section ? `Section: ${String(props.section)}` : null,
        props.time_spent_seconds !== undefined
          ? `Time: ${String(props.time_spent_seconds)}s`
          : null,
        props.reason ? `Reason: ${String(props.reason)}` : null,
      ]);

    case 'section_view_start':
      return props.section ? `Section: ${String(props.section)}` : 'Section view started';

    default: {
      const visibleEntries = Object.entries(props)
        .filter(([key]) => !key.startsWith('_'))
        .slice(0, 4)
        .map(([key, value]) => `${key}: ${String(value)}`);

      return visibleEntries.join(', ');
    }
  }
}

function joinParts(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}