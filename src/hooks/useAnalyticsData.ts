import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Visitor, Session, SessionAnalytics, SectionEngagement, AnalyticsEvent, DailyMetric } from '@/lib/types';

type QueryState<T> = { data: T[]; loading: boolean; error: string | null };

function useSupabaseQuery<T>(table: string, orderBy = 'created_at', ascending = false) {
  const [state, setState] = useState<QueryState<T>>({ data: [], loading: true, error: null });

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending });
    if (error) setState({ data: [], loading: false, error: error.message });
    else setState({ data: (data || []) as T[], loading: false, error: null });
  }, [table, orderBy, ascending]);

  useEffect(() => { fetch(); }, [fetch]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        fetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [table, fetch]);

  return state;
}

export function useVisitors() {
  return useSupabaseQuery<Visitor>('visitors', 'created_at', false);
}

export function useSessions() {
  return useSupabaseQuery<Session>('sessions', 'created_at', false);
}

export function useSessionAnalytics() {
  return useSupabaseQuery<SessionAnalytics>('session_analytics', 'created_at', false);
}

export function useSectionEngagement() {
  return useSupabaseQuery<SectionEngagement>('section_engagement', 'created_at', false);
}

export function useEvents() {
  return useSupabaseQuery<AnalyticsEvent>('events', 'created_at', false);
}

export function useDailyMetrics() {
  return useSupabaseQuery<DailyMetric>('daily_metrics', 'metric_date', true);
}
