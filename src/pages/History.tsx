import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { IconCheck, IconHalf } from '../components/icons'
import { useAuth } from '../contexts/AuthContext'
import { formatDayLabel, formatDuration, formatTime } from '../lib/format'
import { subscribeToSessions } from '../lib/sessions'
import { groupByDay, startOfWeek, summarize } from '../lib/stats'
import type { SessionDoc } from '../lib/types'

export default function History() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [sessions, setSessions] = useState<SessionDoc[] | null>(null)
  const [failed, setFailed] = useState(false)

  const uid = user?.uid
  useEffect(() => {
    if (!uid) return
    return subscribeToSessions(
      uid,
      (list) => {
        setSessions(list)
        setFailed(false)
      },
      (err) => {
        console.error('History subscription failed', err)
        setFailed(true)
      },
    )
  }, [uid])

  // Sessions still "active" are in progress — they aren't history yet.
  const finished = useMemo(() => (sessions ?? []).filter((s) => s.status !== 'active'), [sessions])
  const week = useMemo(() => {
    const since = startOfWeek().getTime()
    return summarize(finished.filter((s) => s.startedAt.getTime() >= since))
  }, [finished])
  const days = useMemo(() => groupByDay(finished), [finished])

  return (
    <section className="flex flex-col gap-6 pt-2">
      <h1 className="text-3xl font-extrabold tracking-tight">{t('history.title')}</h1>

      <div className="rounded-3xl bg-primary-soft p-5">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">
          {t('history.thisWeek')}
        </p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums" aria-label={t('history.totalFocused')}>
          {formatDuration(t, week.totalMinutes)}
        </p>
        <p className="mt-1 text-muted">{t('history.sessions', { count: week.sessions })}</p>
      </div>

      {failed && (
        <p role="alert" className="rounded-xl bg-warm px-4 py-3 text-sm text-warm-ink">
          {t('history.loadError')}
        </p>
      )}

      {sessions === null && !failed && (
        <p className="py-8 text-center text-muted" role="status">
          {t('common.loading')}
        </p>
      )}

      {sessions !== null && finished.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span aria-hidden="true" className="text-5xl">
            🌱
          </span>
          <h2 className="text-xl font-extrabold">{t('history.emptyTitle')}</h2>
          <p className="max-w-xs text-muted">{t('history.emptyBody')}</p>
          <Link
            to="/"
            className="mt-2 grid min-h-14 place-items-center rounded-2xl bg-primary px-8 text-lg font-bold text-on-primary hover:bg-primary-hover"
          >
            {t('history.emptyCta')}
          </Link>
        </div>
      )}

      {days.map((day) => (
        <div key={day.key} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="font-bold">{formatDayLabel(day.date, t, i18n.language)}</h2>
            <span className="text-sm tabular-nums text-muted">{formatDuration(t, day.minutes)}</span>
          </div>
          <ul className="flex flex-col gap-2">
            {day.sessions.map((s) => {
              const completed = s.status === 'completed'
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4"
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-full ${
                      completed ? 'bg-primary-soft text-primary' : 'bg-warm text-warm-ink'
                    }`}
                  >
                    {completed ? <IconCheck className="size-5" /> : <IconHalf className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{s.task || t('common.untitledTask')}</p>
                    <p className="text-sm text-muted">
                      {formatTime(s.startedAt, i18n.language)} ·{' '}
                      {completed
                        ? t('history.completed')
                        : `${t('history.endedEarly')} · ${t('history.ofPlanned', { n: s.plannedMinutes })}`}
                    </p>
                  </div>
                  <p className="shrink-0 font-extrabold tabular-nums">
                    {formatDuration(t, s.actualMinutes)}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </section>
  )
}
