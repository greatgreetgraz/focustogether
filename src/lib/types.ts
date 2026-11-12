import type { RegionId } from './routes'

export type SessionStatus = 'active' | 'completed' | 'ended_early'

/** active = riding; arrived = reached the last stop; ended = switched to another journey part-way. */
export type TripStatus = 'active' | 'arrived' | 'ended'

/** A journey through one region, stored in Firestore `trips/{id}`. */
export interface Trip {
  id: string
  uid: string
  regionId: RegionId
  /** focus minutes needed to cross the region (sets the train's speed) */
  goalMinutes: number
  /** false = first stop to last stop (north→south etc.), true = the other way */
  reversed: boolean
  /** focus minutes put into this trip so far, from all sessions */
  focusedMinutes: number
  startedAt: Date
  endedAt: Date | null
  status: TripStatus
}

/** The trip a running session belongs to, frozen at session start. */
export interface TimerTrip {
  id: string
  regionId: RegionId
  goalMinutes: number
  reversed: boolean
  /** trip.focusedMinutes when this session started */
  focusedBefore: number
}

/** Journey outcome of one session, for the End screen. */
export interface JourneyResult {
  regionId: RegionId
  goalMinutes: number
  reversed: boolean
  before: number
  after: number
  arrived: boolean
}
export type FinishedStatus = Exclude<SessionStatus, 'active'>

/** A session as stored in Firestore `sessions/{id}`, with timestamps converted to Dates. */
export interface SessionDoc {
  id: string
  uid: string
  task: string
  plannedMinutes: number
  actualMinutes: number
  startedAt: Date
  endedAt: Date | null
  status: SessionStatus
  /** Always null in week 1 — reserved for rooms (week 2). */
  roomId: string | null
  /** Always 0 in week 1 — reserved for "friends focusing with you" (week 2). */
  friendsActiveCount: number
  /** Local calendar day of startedAt, "YYYY-MM-DD" — handy for per-day analytics. */
  localDate: string
  /** The journey this session moved forward (null for sessions before journeys existed). */
  tripId: string | null
}

/**
 * The running timer, persisted in localStorage so a reload / backgrounded tab
 * never loses it. Everything the countdown shows is derived from these timestamps.
 */
export interface ActiveTimer {
  sessionId: string
  uid: string
  task: string
  plannedMinutes: number
  /** epoch ms when the session started */
  startedAt: number
  /** epoch ms when the current pause began, or null if running */
  pausedAt: number | null
  /** total ms spent paused in earlier pauses */
  pausedTotalMs: number
  /** the journey this session moves forward (optional: older saved timers lack it) */
  trip?: TimerTrip | null
}

/** What the End screen shows after a session finishes. */
export interface SessionResult {
  sessionId: string
  task: string
  plannedMinutes: number
  actualMinutes: number
  status: FinishedStatus
  endedAt: number
  journey?: JourneyResult | null
}
