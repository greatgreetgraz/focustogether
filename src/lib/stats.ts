import { localDateKey } from './sessions'
import type { SessionDoc } from './types'

/**
 * Pure analytics helpers over a list of sessions. They work on plain
 * SessionDoc objects, so the same functions can be reused for a server-side
 * export (e.g. BigQuery) later. "Finished" = status other than "active".
 */

export interface SessionSummary {
  /** finished sessions */
  sessions: number
  completed: number
  endedEarly: number
  totalMinutes: number
  /** mean actualMinutes over finished sessions (0 if none) */
  avgSessionMinutes: number
  /** completed / finished, or null when there are no finished sessions */
  completionRate: number | null
}

export function summarize(sessions: SessionDoc[]): SessionSummary {
  const finished = sessions.filter((s) => s.status !== 'active')
  const completed = finished.filter((s) => s.status === 'completed').length
  const totalMinutes = finished.reduce((sum, s) => sum + s.actualMinutes, 0)
  return {
    sessions: finished.length,
    completed,
    endedEarly: finished.length - completed,
    totalMinutes,
    avgSessionMinutes: finished.length ? totalMinutes / finished.length : 0,
    completionRate: finished.length ? completed / finished.length : null,
  }
}

/** Start of the week (Monday 00:00 local by default). */
export function startOfWeek(date = new Date(), weekStartsOn = 1): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() - weekStartsOn + 7) % 7))
  return d
}

export interface DayGroup {
  /** "YYYY-MM-DD" */
  key: string
  date: Date
  minutes: number
  sessions: SessionDoc[]
}

/** Group sessions (already sorted newest-first) by local calendar day. */
export function groupByDay(sessions: SessionDoc[]): DayGroup[] {
  const groups = new Map<string, DayGroup>()
  for (const s of sessions) {
    const key = s.localDate || localDateKey(s.startedAt)
    let g = groups.get(key)
    if (!g) {
      const [y, m, d] = key.split('-').map(Number)
      g = { key, date: new Date(y, m - 1, d), minutes: 0, sessions: [] }
      groups.set(key, g)
    }
    g.sessions.push(s)
    g.minutes += s.actualMinutes
  }
  return [...groups.values()]
}
