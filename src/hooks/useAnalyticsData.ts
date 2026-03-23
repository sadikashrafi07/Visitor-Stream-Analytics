import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Visitor,
  Session,
  SessionAnalytics,
  SectionEngagement,
  AnalyticsEvent,
  DailyMetric,
} from '@/lib/types';

type QueryState<T> = {
  data: T[];
  loading: boolean;
  error: string | null;
};

type QueryOptions = {
  realtime?: boolean;
  missingTableFallback?: boolean;
};

type EventsRpcRow = {
  event_id: string;
  created_at: string;
  event_name: string;
  section: string | null;
  page: string | null;
  properties: Record<string, unknown> | null;
  visitor_id: string;
  session_id: string;
};

function isMissingRelationError(message: string | null | undefined) {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes('could not find the table') ||
    m.includes('schema cache') ||
    m.includes('does not exist') ||
    (m.includes('relation') && m.includes('does not exist'))
  );
}

function mapEventsRpcRowToAnalyticsEvent(row: EventsRpcRow): AnalyticsEvent {
  return {
    event_id: row.event_id,
    created_at: row.created_at,
    event_name: row.event_name,
    section: row.section,
    page: row.page,
    properties: row.properties ?? {},
    visitor_id: row.visitor_id,
    session_id: row.session_id,
  };
}

function useSupabaseQuery<T>(
  table: string,
  orderBy = 'created_at',
  ascending = false,
  options: QueryOptions = {}
) {
  const { realtime = true, missingTableFallback = false } = options;

  const [state, setState] = useState<QueryState<T>>({
    data: [],
    loading: true,
    error: null,
  });

  const isMountedRef = useRef(true);

  const fetch = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending });

    if (!isMountedRef.current) return;

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
        error: error.message,
      });
      return;
    }

    setState({
      data: (data || []) as T[],
      loading: false,
      error: null,
    });
  }, [table, orderBy, ascending, missingTableFallback]);

  useEffect(() => {
    isMountedRef.current = true;
    void fetch();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetch]);

  useEffect(() => {
    if (!realtime) return;

    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          void fetch();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, fetch, realtime]);

  return {
    ...state,
    refetch: fetch,
  };
}

function useEventsExplorerFeed(limit = 200) {
  const [state, setState] = useState<QueryState<AnalyticsEvent>>({
    data: [],
    loading: true,
    error: null,
  });

  const isMountedRef = useRef(true);

  const fetch = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    const { data, error } = await supabase.rpc('get_events_explorer_feed', {
      p_limit: limit,
    });

    if (!isMountedRef.current) return;

    if (error) {
      setState({
        data: [],
        loading: false,
        error: error.message,
      });
      return;
    }

    const rows = Array.isArray(data) ? (data as EventsRpcRow[]) : [];

    setState({
      data: rows.map(mapEventsRpcRowToAnalyticsEvent),
      loading: false,
      error: null,
    });
  }, [limit]);

  useEffect(() => {
    isMountedRef.current = true;
    void fetch();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetch]);

  return {
    ...state,
    refetch: fetch,
  };
}

export function useVisitors() {
  return useSupabaseQuery<Visitor>('visitors', 'created_at', false);
}

export function useSessions() {
  return useSupabaseQuery<Session>('sessions', 'created_at', false);
}

/**
 * Temporary safe fallback:
 * `session_analytics` does not currently exist in Supabase.
 * This hook will return an empty dataset instead of breaking the dashboard.
 *
 * When you create a real `session_analytics` table/view later,
 * this hook will start working automatically.
 */
export function useSessionAnalytics() {
  return useSupabaseQuery<SessionAnalytics>(
    'session_analytics',
    'created_at',
    false,
    { missingTableFallback: true }
  );
}

export function useSectionEngagement() {
  return useSupabaseQuery<SectionEngagement>(
    'section_engagement',
    'created_at',
    false
  );
}

export function useEvents() {
  return useEventsExplorerFeed(300);
}

export function useDailyMetrics() {
  return useSupabaseQuery<DailyMetric>('daily_metrics', 'metric_date', true);
}