import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { useTrip } from './TripContext'
import { cancelEndChime, ensureEndChime, notifySessionEnd } from '../lib/alerts'
import { trackEvent } from '../lib/analytics'
import {
  closeStaleActiveSessions,
  createSessionDoc,
  finishSessionDoc,
  newSessionId,
} from '../lib/sessions'
import { addTripProgress } from '../lib/trips'
import {
  clampMinutes,
  elapsedMs,
  naturalEndMs,
  pauseTimer,
  plannedMs,
  resumeTimer,
  round2,
} from '../lib/timer'
import type {
  ActiveTimer,
  FinishedStatus,
  JourneyResult,
  SessionResult,
  TimerTrip,
} from '../lib/types'

const ACTIVE_KEY = 'ft-active'
const RESULT_KEY = 'ft-last-result'

function load<T>(key: string, isValid: (v: Record<string, unknown>) => boolean): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return parsed && typeof parsed === 'object' && isValid(parsed) ? (parsed as T) : null
  } catch {
    return null
  }
}

function save(key: string, value: unknown | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable — timer still works for this page load */
  }
}

const loadActive = () =>
  load<ActiveTimer>(
    ACTIVE_KEY,
    (v) =>
      typeof v.sessionId === 'string' &&
      typeof v.uid === 'string' &&
      typeof v.plannedMinutes === 'number' &&
      typeof v.startedAt === 'number' &&
      typeof v.pausedTotalMs === 'number',
  )

const loadResult = () =>
  load<SessionResult>(
    RESULT_KEY,
    (v) => typeof v.sessionId === 'string' && typeof v.actualMinutes === 'number',
  )

interface SessionState {
  /** The running (or paused) timer, if any. */
  active: ActiveTimer | null
  /** The most recently finished session, for the End screen. */
  result: SessionResult | null
  start: (task: string, minutes: number) => void
  pause: () => void
  resume: () => void
  /** Ends the running session and records it. Returns null if nothing was running. */
  finish: (status: FinishedStatus) => SessionResult | null
  clearResult: () => void
}

const SessionContext = createContext<SessionState | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const { trip } = useTrip()
  const tripRef = useRef(trip)
  tripRef.current = trip

  const [active, setActive] = useState<ActiveTimer | null>(loadActive)
  const [result, setResult] = useState<SessionResult | null>(loadResult)
  const activeRef = useRef(active)
  const finishingRef = useRef(false)

  const commitActive = useCallback((next: ActiveTimer | null) => {
    activeRef.current = next
    setActive(next)
    save(ACTIVE_KEY, next)
  }, [])

  const commitResult = useCallback((next: SessionResult | null) => {
    setResult(next)
    save(RESULT_KEY, next)
  }, [])

  // A timer from a different account on this device doesn't belong to this user.
  // Also tidy up abandoned "active" docs from a lost tab / cleared storage.
  useEffect(() => {
    if (!uid) return
    if (activeRef.current && activeRef.current.uid !== uid) commitActive(null)
    closeStaleActiveSessions(uid, activeRef.current?.sessionId ?? null).catch((err) =>
      console.warn('closeStaleActiveSessions failed', err),
    )
  }, [uid, commitActive])

  const start = useCallback(
    (task: string, minutes: number) => {
      if (!uid) return
      finishingRef.current = false
      const startedAt = Date.now()
      const plannedMinutes = clampMinutes(minutes)
      // If you chose a journey, this session moves it forward. No journey = plain timer.
      const tr = tripRef.current
      const timerTrip: TimerTrip | null = tr
        ? {
            id: tr.id,
            regionId: tr.regionId,
            goalMinutes: tr.goalMinutes,
            reversed: tr.reversed,
            focusedBefore: tr.focusedMinutes,
          }
        : null
      const timer: ActiveTimer = {
        sessionId: newSessionId(),
        uid,
        task: task.trim().slice(0, 100),
        plannedMinutes,
        startedAt,
        pausedAt: null,
        pausedTotalMs: 0,
        trip: timerTrip,
      }
      commitResult(null)
      commitActive(timer)
      // Don't await: with offline persistence the write is queued and the timer starts instantly.
      createSessionDoc({
        id: timer.sessionId,
        uid,
        task: timer.task,
        plannedMinutes,
        startedAtMs: startedAt,
        tripId: timerTrip?.id ?? null,
      }).catch((err) => console.error('createSessionDoc failed', err))
      trackEvent('session_start', { plannedMinutes, hasTask: timer.task.length > 0 })
    },
    [uid, commitActive, commitResult],
  )

  const pause = useCallback(() => {
    const t = activeRef.current
    if (t) commitActive(pauseTimer(t, Date.now()))
  }, [commitActive])

  const resume = useCallback(() => {
    const t = activeRef.current
    if (t) commitActive(resumeTimer(t, Date.now()))
  }, [commitActive])

  const finish = useCallback(
    (status: FinishedStatus): SessionResult | null => {
      const t = activeRef.current
      if (!t || finishingRef.current) return null
      finishingRef.current = true

      const now = Date.now()
      let actualMinutes: number
      let endedAt: number
      if (status === 'completed') {
        actualMinutes = t.plannedMinutes
        // If it hit zero while the tab was away, record when it really ended.
        endedAt = Math.min(now, naturalEndMs(t))
      } else {
        // Stopping early is fine: the minutes focused so far are recorded as-is.
        actualMinutes = round2(Math.min(elapsedMs(t, now), plannedMs(t)) / 60_000)
        endedAt = now
      }

      // Every focused minute moves the train, however the session ended.
      let journey: JourneyResult | null = null
      if (t.trip) {
        const before = t.trip.focusedBefore
        const after = before + actualMinutes
        const arrived = after >= t.trip.goalMinutes - 1e-9
        journey = {
          regionId: t.trip.regionId,
          goalMinutes: t.trip.goalMinutes,
          reversed: t.trip.reversed,
          before,
          after,
          arrived,
        }
        if (actualMinutes > 0 || arrived) {
          addTripProgress({ id: t.trip.id, minutes: actualMinutes, arrived }).catch((err) =>
            console.error('addTripProgress failed', err),
          )
        }
        if (arrived) trackEvent('journey_arrive', { regionId: t.trip.regionId })
      }

      const res: SessionResult = {
        sessionId: t.sessionId,
        task: t.task,
        plannedMinutes: t.plannedMinutes,
        actualMinutes,
        status,
        endedAt,
        journey,
      }

      commitResult(res)
      commitActive(null)

      if (status === 'completed') {
        // Soft chime (plays now if the pre-scheduled one hasn't) + optional notification.
        ensureEndChime()
        notifySessionEnd(t.task, t.plannedMinutes)
      } else {
        cancelEndChime() // stopping early is quiet
      }

      finishSessionDoc({ id: t.sessionId, status, actualMinutes, endedAtMs: endedAt }).catch(
        (err) => console.error('finishSessionDoc failed', err),
      )
      trackEvent(status === 'completed' ? 'session_complete' : 'session_end_early', {
        plannedMinutes: t.plannedMinutes,
        actualMinutes,
      })
      return res
    },
    [commitActive, commitResult],
  )

  const clearResult = useCallback(() => commitResult(null), [commitResult])

  const value = useMemo(
    () => ({ active, result, start, pause, resume, finish, clearResult }),
    [active, result, start, pause, resume, finish, clearResult],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}
