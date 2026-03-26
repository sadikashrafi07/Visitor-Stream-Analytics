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
const EVENTS_FETCH_LIMIT = 1000;
const MAX_SERIALIZABLE_PROPERTY_KEYS = 20;

type EventProperties = Record<string, unknown>;

type SessionVisitMeta = {
  sessionId: string;
  visitorId: string;
  visitIndex: number;
  totalObservedSessions: number;
  isReturning: boolean;
  sessionStartedAtMs: number;
  previousSessionStartedAtMs: number | null;
  returnGapMs: number | null;
};

export function EventExplorer() {
  const {
    data: rawEvents,
    loading,
    error,
  } = useEvents({
    limit: EVENTS_FETCH_LIMIT,
    enabled: true,
    realtime: false,
    sessionId: null,
    since: null,
  });

  const events = useMemo<AnalyticsEvent[]>(
    () => (Array.isArray(rawEvents) ? rawEvents : []),
    [rawEvents]
  );

  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  /**
   * Important design choice:
   * We do NOT reconstruct real visit history from raw events because:
   * - raw events are retained only for a limited window
   * - the fetch is capped
   * - partial history would make visit index / returning flags misleading
   *
   * So we attach only safe per-session metadata.
   */
  const visitMetaBySessionId = useMemo(() => {
    const map = new Map<string, SessionVisitMeta>();

    for (const event of events) {
      const sessionId = normalizeText(event.session_id);
      const visitorId = normalizeText(event.visitor_id);
      const eventMs = safeTime(event.created_at);

      if (!sessionId || !visitorId || eventMs === 0) continue;

      const existing = map.get(sessionId);

      if (!existing) {
        map.set(sessionId, {
          sessionId,
          visitorId,
          visitIndex: 1,
          totalObservedSessions: 1,
          isReturning: false,
          sessionStartedAtMs: eventMs,
          previousSessionStartedAtMs: null,
          returnGapMs: null,
        });
        continue;
      }

      if (eventMs < existing.sessionStartedAtMs) {
        existing.sessionStartedAtMs = eventMs;
      }
    }

    return map;
  }, [events]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => safeTime(b.created_at) - safeTime(a.created_at));
  }, [events]);

  const eventTypes = useMemo(
    () =>
      [
        ...new Set(
          events
            .map((e) => normalizeText(e.event_name))
            .filter(isNonEmptyString)
        ),
      ].sort(),
    [events]
  );

  const sections = useMemo(
    () =>
      [
        ...new Set(
          events
            .map((e) => normalizeText(getRawSection(e)))
            .filter(isNonEmptyString)
        ),
      ].sort(),
    [events]
  );

  const filtered = useMemo(() => {
    let result = sortedEvents;

    if (eventFilter !== 'all') {
      result = result.filter(
        (e) => normalizeText(e.event_name) === eventFilter
      );
    }

    if (sectionFilter !== 'all') {
      result = result.filter(
        (e) => normalizeText(getRawSection(e)) === sectionFilter
      );
    }

    const q = normalizeSearch(search);

    if (q) {
      result = result.filter((event) => {
        const props = getEventProperties(event);
        const visitMeta = visitMetaBySessionId.get(event.session_id ?? '');
        const details =
          extractDetails(event, props, visitMeta).toLowerCase();

        const propertiesText =
          props && Object.keys(props).length <= MAX_SERIALIZABLE_PROPERTY_KEYS
            ? safeSerialize(props).toLowerCase()
            : '';

        const eventText = normalizeText(event.event_name)?.toLowerCase() ?? '';
        const formattedEventText = formatEventName(event.event_name).toLowerCase();
        const sectionText = getDisplaySection(event).toLowerCase();
        const rawSectionText =
          normalizeText(getRawSection(event))?.toLowerCase() ?? '';
        const pageText = normalizeText(event.page)?.toLowerCase() ?? '';
        const visitorText = normalizeText(event.visitor_id)?.toLowerCase() ?? '';
        const sessionText = normalizeText(event.session_id)?.toLowerCase() ?? '';
        const visitIndexText =
          visitMeta?.visitIndex != null ? `visit ${visitMeta.visitIndex}` : '';
        const returningText = visitMeta?.isReturning
          ? 'returning visitor'
          : 'first observed session';

        return (
          eventText.includes(q) ||
          formattedEventText.includes(q) ||
          visitorText.includes(q) ||
          sessionText.includes(q) ||
          sectionText.includes(q) ||
          rawSectionText.includes(q) ||
          pageText.includes(q) ||
          details.includes(q) ||
          propertiesText.includes(q) ||
          visitIndexText.includes(q) ||
          returningText.includes(q)
        );
      });
    }

    return result.slice(0, MAX_ROWS);
  }, [sortedEvents, eventFilter, sectionFilter, search, visitMetaBySessionId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <ChartContainer
      title="Recent Activity Explorer"
      subtitle="Recent event stream from portfolio interactions. Raw events are retained for approximately 14 days."
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
                  const visitMeta = visitMetaBySessionId.get(event.session_id ?? '');
                  const details = extractDetails(event, props, visitMeta);
                  const displaySection = getDisplaySection(event);

                  return (
                    <tr
                      key={event.event_id}
                      className="border-b border-border/50 transition-colors hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                        {safeTime(event.created_at) === 0
                          ? 'Unknown time'
                          : timeAgo(event.created_at)}
                      </td>

                      <td className="px-3 py-2">
                        <span className="analytics-badge bg-primary/10 text-primary">
                          {formatEventName(event.event_name)}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-xs">{displaySection}</td>

                      <td
                        className="max-w-[360px] truncate px-3 py-2 text-xs text-muted-foreground"
                        title={details}
                      >
                        {details}
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

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : null;
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function safeTime(value: string | null | undefined): number {
  const t = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(t) ? t : 0;
}

function shortId(value: string | null | undefined): string {
  if (!value) return '—';
  return value.length > 8 ? `${value.slice(0, 8)}...` : value;
}

function getEventProperties(event: AnalyticsEvent): EventProperties {
  if (event.properties && typeof event.properties === 'object') {
    return event.properties as EventProperties;
  }

  return {};
}

function getRawSection(event: AnalyticsEvent): string | null {
  const directSection = normalizeText(event.section);
  if (directSection) return directSection;

  const props = getEventProperties(event);
  return normalizeText(
    typeof props.section === 'string' ? props.section : null
  );
}

function getDisplaySection(event: AnalyticsEvent): string {
  const rawSection = getRawSection(event);

  if (rawSection) {
    return formatSectionName(rawSection);
  }

  switch (event.event_name) {
    case 'session_start':
    case 'session_end':
      return 'Session';
    case 'scroll_depth':
    case 'scroll_to_top':
      return 'Scroll';
    case 'resume_download':
      return 'Resume';
    case 'contact_submit_attempt':
    case 'contact_submit_success':
    case 'contact_submit_failure':
      return 'Contact';
    default:
      return 'Global';
  }
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

function formatDurationFromMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
}

function formatVisitContext(visitMeta?: SessionVisitMeta): string | null {
  if (!visitMeta) return null;

  const parts: string[] = ['Observed session'];

  if (visitMeta.isReturning) {
    parts.push('Returning visitor');

    if (visitMeta.returnGapMs != null) {
      parts.push(`Gap: ${formatDurationFromMs(visitMeta.returnGapMs)}`);
    }
  } else {
    parts.push('First observed session');
  }

  if (visitMeta.totalObservedSessions > 1) {
    parts.push(`Observed sessions: ${visitMeta.totalObservedSessions}`);
  }

  return parts.join(' • ');
}

function extractDetails(
  event: AnalyticsEvent,
  props: EventProperties,
  visitMeta?: SessionVisitMeta
): string {
  const visitContext = formatVisitContext(visitMeta);
  const rawSection = getRawSection(event);

  switch (event.event_name) {
    case 'nav_click':
      return (
        joinParts([
          props.label ? safeValueToString(props.label) : null,
          props.target ? `→ ${safeValueToString(props.target)}` : null,
          props.location ? `(${safeValueToString(props.location)})` : null,
          visitContext,
        ]) || 'Navigation interaction'
      );

    case 'project_card_click':
    case 'project_click':
      return (
        joinParts([
          props.project_name
            ? `Project: ${safeValueToString(props.project_name)}`
            : null,
          props.method ? `Method: ${safeValueToString(props.method)}` : null,
          props.position !== undefined
            ? `Position: ${safeValueToString(props.position)}`
            : null,
          visitContext,
        ]) || 'Project interaction'
      );

    case 'github_click':
      return (
        joinParts([
          props.project_name
            ? `Project: ${safeValueToString(props.project_name)}`
            : null,
          props.repo ? `Repo: ${safeValueToString(props.repo)}` : null,
          props.location ? `Location: ${safeValueToString(props.location)}` : null,
          visitContext,
        ]) || 'GitHub interaction'
      );

    case 'social_click':
      return (
        joinParts([
          props.platform
            ? `Platform: ${safeValueToString(props.platform)}`
            : null,
          props.location
            ? `Location: ${safeValueToString(props.location)}`
            : null,
          visitContext,
        ]) || 'Social interaction'
      );

    case 'cert_card_click':
    case 'cert_click':
      return (
        joinParts([
          props.cert_name ? safeValueToString(props.cert_name) : null,
          props.issuer ? `by ${safeValueToString(props.issuer)}` : null,
          visitContext,
        ]) || 'Certification interaction'
      );

    case 'cert_nav_click':
      return (
        joinParts([
          props.direction
            ? `Direction: ${safeValueToString(props.direction)}`
            : null,
          props.cert_name
            ? `Cert: ${safeValueToString(props.cert_name)}`
            : null,
          props.issuer ? `Issuer: ${safeValueToString(props.issuer)}` : null,
          visitContext,
        ]) || 'Certification navigation'
      );

    case 'scroll_depth':
      return (
        joinParts([
          `Depth: ${safeValueToString(props.depth ?? 0)}%`,
          visitContext,
        ]) || 'Scroll depth tracked'
      );

    case 'scroll_to_top':
      return (
        joinParts([
          props.scroll_position !== undefined
            ? `From position: ${safeValueToString(props.scroll_position)}`
            : null,
          visitContext,
        ]) || 'Scrolled to top'
      );

    case 'resume_download':
      return (
        joinParts([
          `Source: ${safeValueToString(props.source ?? 'unknown')}`,
          visitContext,
        ]) || 'Resume downloaded'
      );

    case 'contact_submit_success':
      return (
        joinParts([
          'Contact form submitted successfully',
          visitContext,
        ]) || 'Contact form submitted successfully'
      );

    case 'contact_submit_attempt':
      return (
        joinParts([
          props.message_len !== undefined
            ? `Message: ${safeValueToString(props.message_len)} chars`
            : null,
          props.subject_len !== undefined
            ? `Subject: ${safeValueToString(props.subject_len)} chars`
            : null,
          visitContext,
        ]) || 'Contact form submission attempted'
      );

    case 'contact_submit_failure':
      return (
        joinParts([
          props.status ? `Status: ${safeValueToString(props.status)}` : null,
          props.reason ? `Reason: ${safeValueToString(props.reason)}` : null,
          visitContext,
        ]) || 'Contact form submission failed'
      );

    case 'section_view_end':
      return (
        joinParts([
          rawSection ? `Section: ${safeValueToString(rawSection)}` : null,
          props.time_spent_seconds !== undefined
            ? `Time: ${safeValueToString(props.time_spent_seconds)}s`
            : null,
          props.reason ? `Reason: ${safeValueToString(props.reason)}` : null,
          visitContext,
        ]) || 'Section view ended'
      );

    case 'section_view_start':
      return (
        joinParts([
          rawSection ? `Section: ${safeValueToString(rawSection)}` : null,
          visitContext,
        ]) || 'Section view started'
      );

    case 'session_start':
      return (
        joinParts([
          visitContext,
          props.entry_page
            ? `Entry page: ${safeValueToString(props.entry_page)}`
            : event.page
              ? `Entry page: ${safeValueToString(event.page)}`
              : null,
        ]) || 'Session started'
      );

    case 'session_end':
      return (
        joinParts([
          visitContext,
          props.exit_page
            ? `Exit page: ${safeValueToString(props.exit_page)}`
            : event.page
              ? `Exit page: ${safeValueToString(event.page)}`
              : null,
          props.is_bounce !== undefined
            ? `Bounce: ${safeValueToString(props.is_bounce)}`
            : null,
          props.duration_seconds !== undefined
            ? `Duration: ${safeValueToString(props.duration_seconds)}s`
            : null,
          props.max_scroll_depth !== undefined
            ? `Max scroll: ${safeValueToString(props.max_scroll_depth)}`
            : null,
        ]) || 'Session ended'
      );

    default: {
      const visibleEntries = Object.entries(props)
        .filter(([key]) => !key.startsWith('_'))
        .slice(0, 4)
        .map(([key, value]) => `${key}: ${safeValueToString(value)}`);

      return (
        joinParts([
          visibleEntries.join(', ') || 'No extra metadata',
          visitContext,
        ]) || 'No extra metadata'
      );
    }
  }
}

function joinParts(parts: Array<string | null | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' • ');
}