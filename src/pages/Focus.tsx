import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import JourneyStrip from '../components/JourneyStrip'
import MusicPanel from '../components/MusicPanel'
import TimerFace from '../components/TimerFace'
import { useSession } from '../contexts/SessionContext'
import { useNow } from '../hooks/useNow'
import { cancelEndChime, scheduleEndChimeAt } from '../lib/alerts'
import { formatClock } from '../lib/format'
import { updateSettings, useSettings } from '../lib/settings'
import { getRoute, positionAt } from '../lib/routes'
import { elapsedMs, naturalEndMs, plannedMs, remainingMs } from '../lib/timer'

export default function Focus() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { active, result, pause, resume, finish } = useSession()
  const settings = useSettings()
  const now = useNow(250)

  const remaining = active ? remainingMs(active, now) : 0
  const paused = active?.pausedAt != null
  const label = active ? active.task || t('common.untitledTask') : ''
  const hasActive = active !== null

  // Time's up (also fires if the timer ran out while the tab was in the background).
  useEffect(() => {
    if (active && active.pausedAt === null && remaining <= 0) {
      if (finish('completed')) navigate('/end', { replace: true })
    }
  }, [active, remaining, finish, navigate])

  // Schedule the soft end chime on the audio clock (accurate even in a background tab).
  // It is re-scheduled on resume (the end moves) and cancelled while paused.
  const endAt = active && !paused ? naturalEndMs(active) : null
  useEffect(() => {
    if (!hasActive) return // session just finished — don't cut the chime off
    if (endAt === null) cancelEndChime()
    else scheduleEndChimeAt(endAt)
  }, [hasActive, endAt])

  // Calm background wash while focusing; a warmer one while paused (see index.css).
  useEffect(() => {
    document.body.dataset.mode = paused ? 'paused' : 'focus'
    return () => {
      delete document.body.dataset.mode
    }
  }, [paused])

  // Show the countdown in the browser tab title so it's visible while multitasking.
  useEffect(() => {
    if (active) document.title = `${formatClock(remaining)} · ${label}`
  }, [active, remaining, label])
  useEffect(
    () => () => {
      document.title = 'FocusTogether'
    },
    [],
  )

  function doneEarly() {
    if (finish('ended_early')) navigate('/end', { replace: true })
  }

  if (!active) return <Navigate to={result ? '/end' : '/'} replace />

  const ratio = remaining / plannedMs(active)

  // The journey (if you chose one) moves live: minutes from earlier sessions + this one so far.
  const trip = active.trip
  const journey =
    trip && settings.showJourney
      ? (() => {
          const route = getRoute(trip.regionId, trip.reversed)
          const focused =
            trip.focusedBefore + Math.min(elapsedMs(active, now), plannedMs(active)) / 60_000
          return { route, pos: positionAt(route, focused, trip.goalMinutes), goal: trip.goalMinutes }
        })()
      : null

  return (
    <section className="flex flex-col items-center gap-8 pt-2 text-center">
      <div className="w-full">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">
          {t('focus.focusing')}
        </p>
        <h1 className="mt-1 line-clamp-2 break-words text-2xl font-extrabold">{label}</h1>
      </div>

      <button
        type="button"
        onClick={() => updateSettings({ hideDigits: !settings.hideDigits })}
        aria-label={t('focus.toggleDigits')}
        className="block w-full rounded-3xl"
      >
        <TimerFace
          ratio={ratio}
          style={settings.timerStyle}
          hideDigits={settings.hideDigits}
          clock={formatClock(remaining)}
          subLabel={paused ? t('focus.paused') : t('focus.plannedOf', { n: active.plannedMinutes })}
        />
      </button>

      <div className="grid w-full grid-cols-2 gap-3">
        <button
          type="button"
          onClick={paused ? resume : pause}
          className="min-h-16 rounded-2xl border-2 border-primary bg-primary-soft text-lg font-bold text-ink transition-colors hover:brightness-95"
        >
          {paused ? t('focus.resume') : t('focus.pause')}
        </button>
        <button
          type="button"
          onClick={doneEarly}
          className="min-h-16 rounded-2xl border-2 border-field bg-surface text-lg font-bold text-ink transition-colors hover:bg-surface-2"
        >
          {t('focus.doneEarly')}
        </button>
      </div>

      {journey && (
        <div className="w-full pt-2">
          <JourneyStrip route={journey.route} pos={journey.pos} goalMinutes={journey.goal} />
        </div>
      )}

      <MusicPanel />
    </section>
  )
}
