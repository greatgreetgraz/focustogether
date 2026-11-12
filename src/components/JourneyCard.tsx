import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import JourneyStrip from './JourneyStrip'
import { IconTrain } from './icons'
import { useTrip } from '../contexts/TripContext'
import { getRoute, positionAt, regionName } from '../lib/routes'

/** Home: an optional card. No journey chosen = a quiet invitation, never a requirement. */
export default function JourneyCard() {
  const { t, i18n } = useTranslation()
  const { trip, ready } = useTrip()

  if (!ready) return null

  if (!trip) {
    return (
      <Link
        to="/journey"
        className="flex min-h-16 items-center gap-4 rounded-2xl border-2 border-dashed border-field px-4 py-3 transition-colors hover:bg-surface-2"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <IconTrain className="size-6" />
        </span>
        <span className="min-w-0">
          <span className="block font-bold">{t('journey.cardEmptyTitle')}</span>
          <span className="block text-sm text-muted">{t('journey.cardEmptyBody')}</span>
        </span>
      </Link>
    )
  }

  const route = getRoute(trip.regionId, trip.reversed)
  const pos = positionAt(route, trip.focusedMinutes, trip.goalMinutes)

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-bold">
          <IconTrain className="size-5 text-primary" />
          {regionName(route, i18n.language)}
        </p>
        <Link
          to="/journey"
          className="grid min-h-11 place-items-center rounded-xl px-3 text-sm font-bold text-primary hover:bg-surface-2"
        >
          {t('journey.change')}
        </Link>
      </div>
      <JourneyStrip route={route} pos={pos} goalMinutes={trip.goalMinutes} />
    </div>
  )
}
