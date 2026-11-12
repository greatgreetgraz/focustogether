import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import JourneyOutcome from '../components/JourneyOutcome'
import { useSession } from '../contexts/SessionContext'
import { formatDuration, pickMessage } from '../lib/format'

export default function End() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { result, start, clearResult } = useSession()

  if (!result) return <Navigate to="/" replace />

  const completed = result.status === 'completed'
  const messages = t(completed ? 'end.completedMessages' : 'end.earlyMessages', {
    returnObjects: true,
  })
  const message = pickMessage(messages, result.sessionId)

  function again() {
    if (!result) return
    start(result.task, result.plannedMinutes)
    navigate('/focus')
  }

  function leave(to: string) {
    clearResult()
    navigate(to)
  }

  return (
    <section className="flex flex-col items-center gap-6 pt-6 text-center">
      <div
        aria-hidden="true"
        className="grid size-28 place-items-center rounded-full bg-primary-soft text-6xl"
      >
        {completed ? '🌿' : '🌱'}
      </div>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {completed ? t('end.completedTitle') : t('end.earlyTitle')}
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-lg text-muted">{message}</p>
      </div>

      <dl className="grid w-full grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface p-4">
          <dt className="text-sm text-muted">{t('end.focused')}</dt>
          <dd className="mt-1 text-2xl font-extrabold tabular-nums">
            {formatDuration(t, result.actualMinutes)}
          </dd>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <dt className="text-sm text-muted">{t('end.planned')}</dt>
          <dd className="mt-1 text-2xl font-extrabold tabular-nums">
            {formatDuration(t, result.plannedMinutes)}
          </dd>
        </div>
      </dl>

      {result.journey && <JourneyOutcome j={result.journey} />}

      <div className="flex w-full flex-col gap-3 pt-2">
        <button
          type="button"
          onClick={again}
          className="min-h-16 w-full rounded-2xl bg-primary text-xl font-extrabold text-on-primary shadow-md transition-colors hover:bg-primary-hover"
        >
          {t('end.again')}
        </button>
        <button
          type="button"
          onClick={() => leave('/')}
          className="min-h-14 w-full rounded-2xl border-2 border-field bg-surface text-lg font-bold transition-colors hover:bg-surface-2"
        >
          {t('end.newTask')}
        </button>
        <button
          type="button"
          onClick={() => leave('/history')}
          className="min-h-12 w-full rounded-2xl font-bold text-muted transition-colors hover:text-ink"
        >
          {t('end.history')}
        </button>
      </div>
    </section>
  )
}
