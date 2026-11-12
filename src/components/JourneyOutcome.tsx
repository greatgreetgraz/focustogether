import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import JourneyStrip from './JourneyStrip'
import { getRoute, kmPerMinute, positionAt, regionName, stopName } from '../lib/routes'
import type { JourneyResult } from '../lib/types'

/** What this session did for the journey: stops passed, or the arrival. Gentle either way. */
export default function JourneyOutcome({ j }: { j: JourneyResult }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const route = getRoute(j.regionId, j.reversed)
  const before = positionAt(route, j.before, j.goalMinutes)
  const after = positionAt(route, j.after, j.goalMinutes)
  const passed = route.stops.slice(before.passedIndex + 1, after.passedIndex + 1)
  const km = Math.round(
    (Math.min(j.after, j.goalMinutes) - Math.min(j.before, j.goalMinutes)) *
      kmPerMinute(route, j.goalMinutes),
  )
  const list = new Intl.ListFormat(lang === 'th' ? 'th' : 'en', {
    style: 'long',
    type: 'conjunction',
  })

  const last = route.stops[route.stops.length - 1]
  const line = j.arrived
    ? null
    : passed.length > 0
      ? t('journey.endPassed', { stops: list.format(passed.map((s) => stopName(s, lang))) })
      : km >= 1
        ? t('journey.endRolling', { km })
        : t('journey.endOnItsWay')

  return (
    <div className="w-full rounded-2xl border border-line bg-surface p-4 text-center">
      {j.arrived && (
        <>
          <p className="text-xl font-extrabold">
            {t('journey.endArrivedTitle', { stop: stopName(last, lang) })}
          </p>
          <p className="mx-auto mt-1 max-w-xs text-muted">
            {t('journey.endArrivedBody', { region: regionName(route, lang) })}
          </p>
        </>
      )}
      {line && <p className="font-bold">{line}</p>}
      <div className="mt-3">
        <JourneyStrip route={route} pos={after} goalMinutes={j.goalMinutes} />
      </div>
      {j.arrived && (
        <Link
          to="/journey"
          className="mt-4 grid min-h-12 place-items-center rounded-xl border-2 border-field font-bold hover:bg-surface-2"
        >
          {t('journey.chooseNext')}
        </Link>
      )}
    </div>
  )
}
