import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import JourneyCard from '../components/JourneyCard'
import { useAuth } from '../contexts/AuthContext'
import { useSession } from '../contexts/SessionContext'
import { MAX_MINUTES, MIN_MINUTES } from '../lib/timer'

const PRESETS = [10, 25, 45]
const DEFAULT_MINUTES = 25
const LAST_MINUTES_KEY = 'ft-last-minutes'

function readLastMinutes(): number {
  try {
    const n = Number(localStorage.getItem(LAST_MINUTES_KEY))
    return Number.isInteger(n) && n >= MIN_MINUTES && n <= MAX_MINUTES ? n : DEFAULT_MINUTES
  } catch {
    return DEFAULT_MINUTES
  }
}

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { active, start } = useSession()

  const [task, setTask] = useState('')
  // `minutes` is the chosen preset; `customText` (when non-empty) overrides it.
  const [minutes, setMinutes] = useState(readLastMinutes)
  const [customText, setCustomText] = useState(() => {
    const last = readLastMinutes()
    return PRESETS.includes(last) ? '' : String(last)
  })

  // A session is already running (e.g. the tab was reloaded) — go back to it.
  if (active) return <Navigate to="/focus" replace />

  const customActive = customText !== ''
  const chosen = customActive ? Number.parseInt(customText, 10) : minutes
  const valid = Number.isInteger(chosen) && chosen >= MIN_MINUTES && chosen <= MAX_MINUTES

  const firstName = user?.displayName?.trim().split(/\s+/)[0]

  function begin(e?: FormEvent) {
    e?.preventDefault()
    if (!valid) return
    try {
      localStorage.setItem(LAST_MINUTES_KEY, String(chosen))
    } catch {
      /* ignore */
    }
    start(task, chosen)
    navigate('/focus')
  }

  function choosePreset(m: number) {
    setMinutes(m)
    setCustomText('')
  }

  const chip = (selected: boolean) =>
    `min-h-14 flex-1 rounded-2xl border-2 px-2 text-lg font-bold transition-colors ${
      selected
        ? 'border-primary bg-primary-soft text-ink'
        : 'border-field bg-surface text-muted hover:text-ink'
    }`

  return (
    <form onSubmit={begin} className="flex flex-col gap-7 pt-2">
      <div>
        <p className="text-muted">
          {firstName ? t('home.greetingNamed', { name: firstName }) : t('home.greeting')}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">{t('home.heading')}</h1>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="task" className="font-bold">
          {t('home.taskLabel')}
        </label>
        <input
          id="task"
          type="text"
          value={task}
          maxLength={100}
          autoComplete="off"
          enterKeyHint="go"
          onChange={(e) => setTask(e.target.value)}
          placeholder={t('home.taskPlaceholder')}
          className="min-h-16 w-full rounded-2xl border-2 border-field bg-surface px-5 text-lg placeholder:text-muted focus:border-primary focus:outline-none"
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-bold">{t('home.durationLabel')}</legend>
        <div className="flex gap-3">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={!customActive && minutes === m}
              onClick={() => choosePreset(m)}
              className={chip(!customActive && minutes === m)}
            >
              {t('time.minutes', { n: m })}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="custom-minutes" className="w-24 shrink-0 font-semibold text-muted">
            {t('home.custom')}
          </label>
          <input
            id="custom-minutes"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={customText}
            placeholder={t('home.customPlaceholder')}
            onChange={(e) => setCustomText(e.target.value.replace(/\D/g, '').slice(0, 3))}
            aria-describedby="custom-hint"
            className={`min-h-14 w-full rounded-2xl border-2 bg-surface px-5 text-lg tabular-nums placeholder:text-muted focus:border-primary focus:outline-none ${
              customActive ? 'border-primary' : 'border-field'
            }`}
          />
        </div>
        <p
          id="custom-hint"
          className={`text-sm ${customActive && !valid ? 'text-warm-ink' : 'text-muted'}`}
        >
          {t('home.customHint', { min: MIN_MINUTES, max: MAX_MINUTES })}
        </p>
      </fieldset>

      <button
        type="submit"
        disabled={!valid}
        className="min-h-20 w-full rounded-3xl bg-primary text-2xl font-extrabold text-on-primary shadow-md transition-colors hover:bg-primary-hover active:scale-[0.99] disabled:opacity-40"
      >
        {valid ? t('home.startWithMinutes', { minutes: chosen }) : t('home.start')}
      </button>

      {/* Optional: a journey is something you choose, never something the app starts for you. */}
      <JourneyCard />
    </form>
  )
}
