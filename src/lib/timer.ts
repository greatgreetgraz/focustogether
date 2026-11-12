import type { ActiveTimer } from './types'

/**
 * Pure timer math. The countdown is never "counted" with setInterval ticks —
 * every value is derived from timestamps, so throttled / suspended background
 * tabs can't make it drift.
 */

export const MIN_MINUTES = 1
export const MAX_MINUTES = 600

export function plannedMs(t: ActiveTimer): number {
  return t.plannedMinutes * 60_000
}

/** Milliseconds actually spent focusing (excludes paused time). */
export function elapsedMs(t: ActiveTimer, now: number): number {
  const currentPause = t.pausedAt !== null ? now - t.pausedAt : 0
  return Math.max(0, now - t.startedAt - t.pausedTotalMs - currentPause)
}

export function remainingMs(t: ActiveTimer, now: number): number {
  return Math.max(0, plannedMs(t) - elapsedMs(t, now))
}

export function pauseTimer(t: ActiveTimer, now: number): ActiveTimer {
  return t.pausedAt === null ? { ...t, pausedAt: now } : t
}

export function resumeTimer(t: ActiveTimer, now: number): ActiveTimer {
  if (t.pausedAt === null) return t
  return { ...t, pausedAt: null, pausedTotalMs: t.pausedTotalMs + (now - t.pausedAt) }
}

/**
 * The real moment a running timer reaches zero. Used so that a session that
 * finished while the tab was in the background is recorded with its true end time.
 */
export function naturalEndMs(t: ActiveTimer): number {
  return t.startedAt + t.pausedTotalMs + plannedMs(t)
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function clampMinutes(n: number): number {
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(n)))
}
