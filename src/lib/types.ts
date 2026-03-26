export type NullableString = string | null;
export type NumericLike = number | string;

export type BounceFilter = 'all' | 'bounce' | 'non-bounce';
export type ConversionFilter = 'all' | 'yes' | 'no';

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = Record<string, JsonValue>;

export interface Visitor {
  visitor_id: string;
  first_visit_at: string;
  last_visit_at: string;
  total_sessions: number;
  country: NullableString;
  device_type: NullableString;
  browser: NullableString;
  os: NullableString;
  referrer: NullableString;
  first_utm_source: NullableString;
  first_utm_medium: NullableString;
  first_utm_campaign: NullableString;
  first_utm_content: NullableString;
  first_utm_term: NullableString;
  created_at: string;
}

export interface Session {
  session_id: string;
  visitor_id: string;
  session_start: string;
  session_end: NullableString;
  duration_seconds: number;
  entry_page: NullableString;
  exit_page: NullableString;
  is_bounce: boolean;
  landing_page: NullableString;
  utm_source: NullableString;
  utm_medium: NullableString;
  utm_campaign: NullableString;
  utm_content: NullableString;
  utm_term: NullableString;
  created_at: string;
}

export interface SessionAnalytics {
  session_id: string;
  visitor_id: string;
  duration_seconds: number;
  max_scroll_depth: number;
  sections_visited: JsonValue[] | string;
  project_clicks: number;
  github_clicks: number;
  cert_clicks: number;
  social_clicks: number;
  resume_downloads: number;
  contact_submits: number;
  nav_clicks: number;
  project_clicks_by_name: JsonObject | string;
  social_clicks_by_platform: JsonObject | string;
  cert_clicks_by_name: JsonObject | string;
  cert_clicks_by_issuer: JsonObject | string;
  sections_count: number;
  total_section_time: number;
  has_conversion: boolean;
  conversion_resume: boolean;
  conversion_contact: boolean;
  engagement_score: number;
  cert_nav_clicks: number;
  is_engaged_session: boolean;
  created_at: string;
}

export interface SectionEngagement {
  id: string;
  visitor_id: string;
  session_id: string;
  section_name: string;
  time_spent_seconds: number;
  created_at: string;
}

export interface AnalyticsEvent {
  event_id: string;
  visitor_id: string;
  session_id: string;
  event_name: string;
  page: NullableString;
  section: NullableString;
  properties: JsonObject;
  created_at: string;
}

export interface DailyMetric {
  metric_date: string;
  total_visitors: number;
  total_sessions: number;
  avg_session_duration: NumericLike;
  bounce_rate: NumericLike;
  github_clicks: number;
  project_clicks: number;
  cert_clicks: number;
  social_clicks: number;
  resume_downloads: number;
  contact_submits: number;
  total_conversions: number;
  resume_conversions: number;
  contact_conversions: number;
  avg_engagement_score: NumericLike;
  cert_nav_clicks: number;
  engaged_sessions: number;
  engaged_session_rate: NumericLike;
  refreshed_at: string;

  /**
   * Backward-compatibility only.
   * The database now uses `refreshed_at`.
   * Keep this optional so older frontend code does not break immediately.
   */
  created_at?: string;
}

export interface FilterState {
  dateRange: DateRange;
  country: NullableString;
  deviceType: NullableString;
  browser: NullableString;
  os: NullableString;
  referrer: NullableString;
  utmSource: NullableString;
  utmMedium: NullableString;
  utmCampaign: NullableString;
  bounceFilter: BounceFilter;
  hasConversion: ConversionFilter;
  section: NullableString;
  eventType: NullableString;
}