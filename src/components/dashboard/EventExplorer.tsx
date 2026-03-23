import { useMemo, useState } from 'react';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  ChartContainer,
} from './ChartContainer';
import { useEvents } from '@/hooks/useAnalyticsData';
import {
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
    () => [...new Set(events.map((e) => e.event_name).filter(Boolean))].sort(),
    [events]
  );

  const sections = useMemo(() => {
    return [
      ...new Set(
        events.map((e) => normalizeText(e.section)).filter(isNonEmptyString)
      ),
    ].sort();
  }, [events]);

  const filtered = useMemo(() => {
    let result = [...events];

    result.sort((a, b) => safeTime(b.created_at) - safeTime(a.created_at));

    if (eventFilter !== 'all') {
      result = result.filter((e) => e.event_name === eventFilter);
    }

    if (sectionFilter !== 'all') {
      result = result.filter((e) => normalizeText(e.section) === sectionFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();

      result = result.filter((e) => {
        const props = getEventProperties(e);

        const details = extractDetails(e, props).toLowerCase();
        const propertiesText = safeSerialize(props).toLowerCase();

        const eventText = normalizeText(e.event_name)?.toLowerCase() ?? '';
        const sectionText = normalizeText(e.section)?.toLowerCase() ?? '';
        const pageText = normalizeText(e.page)?.toLowerCase() ?? '';
        const visitorText = normalizeText(e.visitor_id)?.toLowerCase() ?? '';
        const sessionText = normalizeText(e.session_id)?.toLowerCase() ?? '';

        return (
          eventText.includes(q) ||
          visitorText.includes(q) ||
          sessionText.includes(q) ||
          sectionText.includes(q) ||
          pageText.includes(q) ||
          details.includes(q) ||
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
                  const props = getEventProperties(event);
                  const details = extractDetails(event, props);

                  return (
                    <tr
                      key={event.event_id}
                      className="border-b border-border/50 transition-colors hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                        {safeTime(event.created_at) === 0
                          ? '—'
                          : timeAgo(event.created_at)}
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
            Showing {filtered.length} of {events.length} events (maximum{' '}
            {MAX_ROWS} rows rendered for performance).
          </p>
        </>
      )}
    </ChartContainer>
  );
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeText(value: string | null | undefined) {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : null;
}

function safeTime(value: string | null | undefined) {
  const t = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(t) ? t : 0;
}

function shortId(value: string | null | undefined) {
  if (!value) return '—';
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}

function getEventProperties(
  event: AnalyticsEvent
): Record<string, unknown> {
  if (event.properties && typeof event.properties === 'object') {
    return event.properties as Record<string, unknown>;
  }

  return {};
}

function safeValueToString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function safeSerialize(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return '';
  }
}

function extractDetails(
  event: AnalyticsEvent,
  props: Record<string, unknown>
): string {
  switch (event.event_name) {
    case 'nav_click':
      return joinParts([
        props.label ? safeValueToString(props.label) : null,
        props.target ? `→ ${safeValueToString(props.target)}` : null,
        props.location ? `(${safeValueToString(props.location)})` : null,
      ]);

    case 'project_card_click':
      return joinParts([
        props.project_name
          ? `Project: ${safeValueToString(props.project_name)}`
          : null,
        props.method ? `Method: ${safeValueToString(props.method)}` : null,
        props.position !== undefined
          ? `Position: ${safeValueToString(props.position)}`
          : null,
      ]);

    case 'social_click':
      return joinParts([
        props.platform ? `Platform: ${safeValueToString(props.platform)}` : null,
        props.location ? `Location: ${safeValueToString(props.location)}` : null,
      ]);

    case 'cert_card_click':
      return joinParts([
        props.cert_name ? safeValueToString(props.cert_name) : null,
        props.issuer ? `by ${safeValueToString(props.issuer)}` : null,
      ]);

    case 'cert_nav_click':
      return joinParts([
        props.direction
          ? `Direction: ${safeValueToString(props.direction)}`
          : null,
        props.cert_name ? `Cert: ${safeValueToString(props.cert_name)}` : null,
        props.issuer ? `Issuer: ${safeValueToString(props.issuer)}` : null,
      ]);

    case 'scroll_depth':
      return `Depth: ${safeValueToString(props.depth ?? 0)}%`;

    case 'scroll_to_top':
      return joinParts([
        props.scroll_position !== undefined
          ? `From position: ${safeValueToString(props.scroll_position)}`
          : null,
      ]);

    case 'resume_download':
      return `Source: ${safeValueToString(props.source ?? 'unknown')}`;

    case 'contact_submit_success':
      return 'Contact form submitted successfully';

    case 'contact_submit_attempt':
      return joinParts([
        props.message_len !== undefined
          ? `Message: ${safeValueToString(props.message_len)} chars`
          : null,
        props.subject_len !== undefined
          ? `Subject: ${safeValueToString(props.subject_len)} chars`
          : null,
      ]);

    case 'contact_submit_failure':
      return joinParts([
        props.status ? `Status: ${safeValueToString(props.status)}` : null,
        props.reason ? `Reason: ${safeValueToString(props.reason)}` : null,
      ]);

    case 'section_view_end':
      return joinParts([
        props.section ? `Section: ${safeValueToString(props.section)}` : null,
        props.time_spent_seconds !== undefined
          ? `Time: ${safeValueToString(props.time_spent_seconds)}s`
          : null,
        props.reason ? `Reason: ${safeValueToString(props.reason)}` : null,
      ]);

    case 'section_view_start':
      return props.section
        ? `Section: ${safeValueToString(props.section)}`
        : 'Section view started';

    case 'session_start':
      return props.entry_page
        ? `entry_page: ${safeValueToString(props.entry_page)}`
        : 'Session started';

    case 'session_end':
      return joinParts([
        props.exit_page ? `exit_page: ${safeValueToString(props.exit_page)}` : null,
        props.is_bounce !== undefined
          ? `is_bounce: ${safeValueToString(props.is_bounce)}`
          : null,
        props.duration_seconds !== undefined
          ? `duration_seconds: ${safeValueToString(props.duration_seconds)}`
          : null,
        props.max_scroll_depth !== undefined
          ? `max_scroll_depth: ${safeValueToString(props.max_scroll_depth)}`
          : null,
      ]);

    default: {
      const visibleEntries = Object.entries(props)
        .filter(([key]) => !key.startsWith('_'))
        .slice(0, 4)
        .map(([key, value]) => `${key}: ${safeValueToString(value)}`);

      return visibleEntries.join(', ');
    }
  }
}

function joinParts(parts: Array<string | null | undefined>) {
  return parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' ');
}