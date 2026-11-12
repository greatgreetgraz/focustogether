/**
 * Single place to send product analytics from. Week 1: a no-op (logs in dev).
 * Wire GA4 / PostHog / Firebase Analytics here later without touching screens.
 *
 * Average session length and completion rate don't need this at all — they're
 * computed from Firestore `sessions` docs (see lib/stats.ts).
 */

export type AnalyticsEvent =
  | 'session_start'
  | 'session_complete'
  | 'session_end_early'
  | 'journey_start'
  | 'journey_arrive'
  | 'journey_leave'
  | 'language_change'
  | 'theme_change'

export type AnalyticsParams = Record<string, string | number | boolean | null>

export function trackEvent(name: AnalyticsEvent, params: AnalyticsParams = {}): void {
  if (import.meta.env.DEV) {
    console.debug('[analytics]', name, params)
  }
  // TODO(week 2+): forward to the chosen analytics provider.
}
