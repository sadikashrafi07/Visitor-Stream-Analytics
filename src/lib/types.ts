export interface Visitor {
  visitor_id: string;
  first_visit_at: string;
  last_visit_at: string;
  total_sessions: number;
  country: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  first_utm_source: string | null;
  first_utm_medium: string | null;
  first_utm_campaign: string | null;
  first_utm_content: string | null;
  first_utm_term: string | null;
  created_at: string;
}

export interface Session {
  session_id: string;
  visitor_id: string;
  session_start: string;
  session_end: string | null;
  duration_seconds: number;
  entry_page: string;
  exit_page: string;
  is_bounce: boolean;
  landing_page: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  created_at: string;
}

export interface SessionAnalytics {
  session_id: string;
  visitor_id: string;
  duration_seconds: number;
  max_scroll_depth: number;
  sections_visited: string;
  project_clicks: number;
  github_clicks: number;
  cert_clicks: number;
  social_clicks: number;
  resume_downloads: number;
  contact_submits: number;
  nav_clicks: number;
  project_clicks_by_name: string;
  social_clicks_by_platform: string;
  cert_clicks_by_name: string;
  cert_clicks_by_issuer: string;
  sections_count: number;
  total_section_time: number;
  has_conversion: boolean;
  conversion_resume: boolean;
  conversion_contact: boolean;
  engagement_score: number;
  cert_nav_clicks: number;
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
  page: string;
  section: string | null;
  properties: string;
  created_at: string;
}

export interface DailyMetric {
  metric_date: string;
  total_visitors: number;
  total_sessions: number;
  avg_session_duration: string;
  bounce_rate: string;
  github_clicks: number;
  project_clicks: number;
  cert_clicks: number;
  social_clicks: number;
  resume_downloads: number;
  contact_submits: number;
  total_conversions: number;
  resume_conversions: number;
  contact_conversions: number;
  avg_engagement_score: string;
  cert_nav_clicks: number;
  created_at: string;
}

export interface FilterState {
  dateRange: { from: Date | null; to: Date | null };
  country: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  bounceFilter: 'all' | 'bounce' | 'non-bounce';
  hasConversion: 'all' | 'yes' | 'no';
  section: string | null;
  eventType: string | null;
}
