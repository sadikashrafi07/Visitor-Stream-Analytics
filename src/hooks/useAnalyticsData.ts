import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Visitor,
  Session,
  SessionAnalytics,
  SectionEngagement,
  AnalyticsEvent,
  DailyMetric,
  JsonObject,
  JsonValue,
} from '@/lib/types';

type QueryState<T> = {
  data: T[];
  loading: boolean;
  error: string | null;
};

type QueryOptions<T> = {
  realtime?: boolean;
  enabled?: boolean;
  missingTableFallback?: boolean;
  orderBy?: string;
  ascending?: boolean;
  select?: string;
  transform?: (rows: unknown[]) => T[];
};

type EventsFeedOptions = {
  realtime?: boolean;
  enabled?: boolean;
  limit?: number;
  sessionId?: string | null;
  since?: string | null;
};

function normalizeErrorMessage(message: string | null | undefined): string {
  return typeof message === 'string' ? message.trim().toLowerCase() : '';
}

function isMissingRelationError(message: string | null | undefined): boolean {
  const m = normalizeErrorMessage(message);

  return (
    m.includes('could not find the table') ||
    m.includes('schema cache') ||
    m.includes('does not exist') ||
    (m.includes('relation') && m.includes('does not exist')) ||
    m.includes('could not find the function')
  );
}

function isPermissionError(message: string | null | undefined): boolean {
  const m = normalizeErrorMessage(message);

  return (
    m.includes('permission denied') ||
    m.includes('not allowed') ||
    m.includes('row-level security') ||
    m.includes('violates row-level security policy') ||
    m.includes('insufficient privilege')
  );
}

function isJsonPrimitive(
  value: unknown
): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function normalizeJsonValue(value: unknown): JsonValue {
  if (isJsonPrimitive(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item));
  }

  if (typeof value === 'object' && value !== null) {
    const obj: JsonObject = {};

    for (const [key, val] of Object.entries(value)) {
      obj[key] = normalizeJsonValue(val);
    }

    return obj;
  }

  return String(value);
}

function toJsonObject(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const result: JsonObject = {};

  for (const [key, val] of Object.entries(value)) {
    result[key] = normalizeJsonValue(val);
  }

  return result;
}

function makeRealtimeChannelName(base: string): string {
  return `${base}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeRows<T>(rows: unknown): T[] {
  return Array.isArray(rows) ? (rows as T[]) : [];
}

function normalizeEvents(rows: unknown[]): AnalyticsEvent[] {
  return rows
    .filter(
      (row): row is Record<string, unknown> =>
        Boolean(row) && typeof row === 'object'
    )
    .map((row) => {
      const event_id = typeof row.event_id === 'string' ? row.event_id : '';
      const created_at =
        typeof row.created_at === 'string' ? row.created_at : '';
      const event_name =
        typeof row.event_name === 'string' ? row.event_name : '';
      const section =
        typeof row.section === 'string' && row.section.trim() !== ''
          ? row.section
          : null;
      const page =
        typeof row.page === 'string' && row.page.trim() !== ''
          ? row.page
          : null;
      const visitor_id =
        typeof row.visitor_id === 'string' ? row.visitor_id : '';
      const session_id =
        typeof row.session_id === 'string' ? row.session_id : '';

      return {
        event_id,
        created_at,
        event_name,
        section,
        page,
        properties: toJsonObject(row.properties),
        visitor_id,
        session_id,
      };
    })
    .filter(
      (row) =>
        Boolean(
          row.event_id &&
            row.created_at &&
            row.event_name &&
            row.visitor_id &&
            row.session_id
        )
    );
}

function normalizeSupabaseError(
  tableOrSource: string,
  message: string | null | undefined
): string {
  if (isPermissionError(message)) {
    return `Access denied for ${tableOrSource}. Ensure the user is authenticated and allowed by RLS policies.`;
  }

  return message || `Failed to fetch ${tableOrSource}`;
}

function useSupabaseQuery<T>(
  table: string,
  {
    realtime = false,
    enabled = true,
    missingTableFallback = false,
    orderBy = 'created_at',
    ascending = false,
    select = '*',
    transform,
  }: QueryOptions<T> = {}
) {
  const [state, setState] = useState<QueryState<T>>({
    data: [],
    loading: enabled,
    error: null,
  });

  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const fetch = useCallback(async () => {
    if (!enabled) {
      if (isMountedRef.current) {
        setState({
          data: [],
          loading: false,
          error: null,
        });
      }
      return;
    }

    const requestId = ++requestIdRef.current;

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    let query = supabase.from(table).select(select);

    if (orderBy) {
      query = query.order(orderBy, { ascending });
    }

    const { data, error } = await query;

    if (!isMountedRef.current || requestId !== requestIdRef.current) return;

    if (error) {
      if (missingTableFallback && isMissingRelationError(error.message)) {
        setState({
          data: [],
          loading: false,
          error: null,
        });
        return;
      }

      setState({
        data: [],
        loading: false,
        error: normalizeSupabaseError(table, error.message),
      });
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    const normalized = transform ? transform(rows) : normalizeRows<T>(rows);

    setState({
      data: normalized,
      loading: false,
      error: null,
    });
  }, [
    table,
    enabled,
    select,
    orderBy,
    ascending,
    transform,
    missingTableFallback,
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    void fetch();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetch]);

  useEffect(() => {
    if (!enabled || !realtime) return;

    const channel = supabase
      .channel(makeRealtimeChannelName(`${table}-changes`))
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        void fetch();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, fetch, realtime, enabled]);

  return {
    ...state,
    refetch: fetch,
  };
}

function useEventsFeed({
  realtime = false,
  enabled = true,
  limit = 300,
  sessionId = null,
  since = null,
}: EventsFeedOptions = {}) {
  const [state, setState] = useState<QueryState<AnalyticsEvent>>({
    data: [],
    loading: enabled,
    error: null,
  });

  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const fetch = useCallback(async () => {
    if (!enabled) {
      if (isMountedRef.current) {
        setState({
          data: [],
          loading: false,
          error: null,
        });
      }
      return;
    }

    const requestId = ++requestIdRef.current;

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    const { data, error } = await supabase.rpc('get_events_explorer_feed', {
      p_limit: limit,
      p_session_id: sessionId,
      p_since: since,
    });

    if (!isMountedRef.current || requestId !== requestIdRef.current) return;

    if (error) {
      setState({
        data: [],
        loading: false,
        error: normalizeSupabaseError('get_events_explorer_feed', error.message),
      });
      return;
    }

    setState({
      data: normalizeEvents(Array.isArray(data) ? data : []),
      loading: false,
      error: null,
    });
  }, [enabled, limit, sessionId, since]);

  useEffect(() => {
    isMountedRef.current = true;
    void fetch();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetch]);

  useEffect(() => {
    if (!enabled || !realtime) return;

    const channel = supabase
      .channel(makeRealtimeChannelName('events-realtime'))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          void fetch();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetch, realtime, enabled]);

  return {
    ...state,
    refetch: fetch,
  };
}

/**
 * Public-safe hook:
 * daily_metrics is the only analytics table that should normally be public.
 */
export function useDailyMetrics(realtime = false) {
  return useSupabaseQuery<DailyMetric>('daily_metrics', {
    realtime,
    orderBy: 'metric_date',
    ascending: false,
    select: '*',
  });
}

/**
 * Admin hooks:
 * These depend on authenticated access and your RLS admin policies.
 */
export function useVisitors(realtime = false, enabled = true) {
  return useSupabaseQuery<Visitor>('visitors', {
    realtime,
    enabled,
    orderBy: 'created_at',
    ascending: false,
    select: '*',
  });
}

export function useSessions(realtime = false, enabled = true) {
  return useSupabaseQuery<Session>('sessions', {
    realtime,
    enabled,
    orderBy: 'created_at',
    ascending: false,
    select: '*',
  });
}

export function useSessionAnalytics(realtime = false, enabled = true) {
  return useSupabaseQuery<SessionAnalytics>('session_summary', {
    realtime,
    enabled,
    orderBy: 'created_at',
    ascending: false,
    select: '*',
  });
}

export function useSectionEngagement(realtime = false, enabled = true) {
  return useSupabaseQuery<SectionEngagement>('section_engagement', {
    realtime,
    enabled,
    orderBy: 'created_at',
    ascending: false,
    select: '*',
  });
}

export function useEvents(
  options: EventsFeedOptions = {
    realtime: false,
    enabled: true,
    limit: 300,
    sessionId: null,
    since: null,
  }
) {
  return useEventsFeed(options);
}