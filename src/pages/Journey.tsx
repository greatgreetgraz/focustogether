import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import JourneyStrip, { formatKmPerMinute } from '../components/JourneyStrip'
import { useTrip } from '../contexts/TripContext'
import { formatDuration } from '../lib/format'
import {
  DEFAULT_GOAL_MINUTES,
  GOAL_PRESETS_MINUTES,
  MAX_GOAL_MINUTES,
  MIN_GOAL_MINUTES,
  REGIONS,
  getRoute,
  positionAt,
  regionName,
  routeKm,
  stopName,
  type RegionId,
} from '../lib/routes'

export default function Journey() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const navigate = useNavigate()
  const { trip, startTrip, leaveTrip } = useTrip()

  // Nothing is preselected for the region: the choice is yours.
  const [regionId, setRegionId] = useState<RegionId | null>(null)
  const [goal, setGoal] = useState(DEFAULT_GOAL_MINUTES)
  const [customText, setCustomText] = useState('')
  const [reversed, setReversed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const customActive = customText !== ''
  const chosenGoal = customActive ? Number.parseInt(customText, 10) : goal
  const goalValid =
    Number.isInteger(chosenGoal) && chosenGoal >= MIN_GOAL_MINUTES && chosenGoal <= MAX_GOAL_MINUTES

  const selected = regionId ? getRoute(regionId, reversed) : null
  const canStart = selected !== null && goalValid && !busy

  async function begin(e: FormEvent) {
    e.preventDefault()
    if (!regionId || !goalValid) return
    setBusy(true)
    setFailed(false)
    try {
      await startTrip({ regionId, goalMinutes: chosenGoal, reversed })
      navigate('/')
    } catch (err) {
      console.error('startTrip failed', err)
      setFailed(true)
      setBusy(false)
    }
  }

  const chip = (on: boolean) =>
    `min-h-14 flex-1 rounded-2xl border-2 px-2 text-lg font-bold transition-colors ${
      on ? 'border-primary bg-primary-soft text-ink' : 'border-field bg-surface text-muted hover:text-ink'
    }`

  const currentRoute = trip ? getRoute(trip.regionId, trip.reversed) : null

  return (
    <form onSubmit={begin} className="flex flex-col gap-7 pt-2">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{t('journey.title')}</h1>
        <p className="mt-2 text-muted">{t('journey.intro')}</p>
      </div>

      {trip && currentRoute && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="font-bold">
            {t('journey.currentTitle')} · {regionName(currentRoute, lang)}
          </p>
          <div className="mt-3">
            <JourneyStrip
              route={currentRoute}
              pos={positionAt(currentRoute, trip.focusedMinutes, trip.goalMinutes)}
              goalMinutes={trip.goalMinutes}
            />
          </div>
          <p className="mt-3 text-sm text-muted">{t('journey.currentNote')}</p>
          <button
            type="button"
            onClick={() => void leaveTrip()}
            className="mt-3 min-h-12 w-full rounded-xl border-2 border-field font-bold hover:bg-surface-2"
          >
            {t('journey.leave')}
          </button>
        </div>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-bold">{t('journey.regionHeading')}</legend>
        <div role="radiogroup" aria-label={t('journey.regionHeading')} className="flex flex-col gap-3">
          {REGIONS.map((r) => {
            const route = getRoute(r.id, reversed)
            const on = regionId === r.id
            return (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setRegionId(r.id)}
                className={`min-h-16 rounded-2xl border-2 px-4 py-3 text-left transition-colors ${
                  on ? 'border-primary bg-primary-soft' : 'border-field bg-surface hover:bg-surface-2'
                }`}
              >
                <span className="block text-lg font-extrabold">{regionName(r, lang)}</span>
                <span className="block text-sm text-muted">
                  {t('journey.routeLine', {
                    from: stopName(route.stops[0], lang),
                    to: stopName(route.stops[route.stops.length - 1], lang),
                    km: routeKm(r),
                  })}
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-bold">{t('journey.directionHeading')}</legend>
        <div role="radiogroup" aria-label={t('journey.directionHeading')} className="grid grid-cols-2 gap-3">
          {[false, true].map((rev) => {
            const on = reversed === rev
            const start = regionId ? getRoute(regionId, rev).stops[0] : null
            return (
              <button
                key={String(rev)}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setReversed(rev)}
                className={`min-h-16 rounded-2xl border-2 px-3 py-2 text-center transition-colors ${
                  on ? 'border-primary bg-primary-soft' : 'border-field bg-surface hover:bg-surface-2'
                }`}
              >
                <span className="block font-bold">
                  {rev ? t('journey.fromBottom') : t('journey.fromTop')}
                </span>
                {start && <span className="block text-sm text-muted">{stopName(start, lang)}</span>}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-bold">{t('journey.goalHeading')}</legend>
        <div className="flex gap-3">
          {GOAL_PRESETS_MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={!customActive && goal === m}
              onClick={() => {
                setGoal(m)
                setCustomText('')
              }}
              className={chip(!customActive && goal === m)}
            >
              {formatDuration(t, m)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="custom-goal" className="w-28 shrink-0 font-semibold text-muted">
            {t('journey.customGoal')}
          </label>
          <input
            id="custom-goal"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={customText}
            placeholder={t('home.customPlaceholder')}
            onChange={(e) => setCustomText(e.target.value.replace(/\D/g, '').slice(0, 4))}
            aria-describedby="goal-hint"
            className={`min-h-14 w-full rounded-2xl border-2 bg-surface px-5 text-lg tabular-nums placeholder:text-muted focus:border-primary focus:outline-none ${
              customActive ? 'border-primary' : 'border-field'
            }`}
          />
        </div>
        <p
          id="goal-hint"
          className={`text-sm ${customActive && !goalValid ? 'text-warm-ink' : 'text-muted'}`}
        >
          {selected && goalValid
            ? t('journey.speed', { km: formatKmPerMinute(selected, chosenGoal) })
            : t('journey.goalHint', { min: MIN_GOAL_MINUTES, max: MAX_GOAL_MINUTES })}
        </p>
      </fieldset>

      {failed && (
        <p role="alert" className="rounded-xl bg-warm px-4 py-3 text-sm text-warm-ink">
          {t('journey.error')}
        </p>
      )}

      <button
        type="submit"
        disabled={!canStart}
        className="min-h-20 w-full rounded-3xl bg-primary text-2xl font-extrabold text-on-primary shadow-md transition-colors hover:bg-primary-hover active:scale-[0.99] disabled:opacity-40"
      >
        {busy ? t('journey.starting') : selected ? t('journey.start') : t('journey.pickRegion')}
      </button>

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="-mt-3 min-h-12 w-full rounded-2xl font-bold text-muted hover:text-ink"
      >
        {t('journey.back')}
      </button>
    </form>
  )
}
