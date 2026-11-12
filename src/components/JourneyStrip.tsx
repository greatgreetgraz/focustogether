import { useTranslation } from 'react-i18next'
import { IconTrain } from './icons'
import {
  kmPerMinute,
  minutesToNext,
  stopName,
  type Position,
  type Region,
} from '../lib/routes'

interface Props {
  /** The route as travelled (already reversed if the journey runs bottom-to-top). */
  route: Region
  pos: Position
  goalMinutes: number
}

/**
 * A calm picture of the line: one dot per station, evenly spaced, and a little
 * train between the last station passed and the next one.
 */
export default function JourneyStrip({ route, pos, goalMinutes }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const stops = route.stops
  const n = stops.length
  const trainAt = ((pos.passedIndex + pos.segmentFraction) / (n - 1)) * 100

  const toNext = Math.max(1, Math.ceil(minutesToNext(route, pos, goalMinutes) - 1e-9))
  const last = stops[n - 1]

  return (
    <div className="w-full">
      {/* the line */}
      <div className="relative mx-4 h-12" aria-hidden="true">
        <div className="absolute inset-x-0 top-[calc(100%-1rem)] h-1.5 -translate-y-1/2 rounded-full bg-track" />
        <div
          className="absolute left-0 top-[calc(100%-1rem)] h-1.5 -translate-y-1/2 rounded-full bg-primary"
          style={{ width: `${trainAt}%`, transition: 'width 300ms linear' }}
        />
        {stops.map((s, i) => {
          const reached = i <= pos.passedIndex
          return (
            <span
              key={`${s.en}-${i}`}
              className={`absolute top-[calc(100%-1rem)] size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                reached ? 'border-primary bg-primary' : 'border-field bg-surface'
              }`}
              style={{ left: `${(i / (n - 1)) * 100}%` }}
            />
          )
        })}
        <span
          className="absolute top-0 grid size-8 -translate-x-1/2 place-items-center rounded-full bg-primary text-on-primary shadow-md"
          style={{ left: `${trainAt}%`, transition: 'left 300ms linear' }}
        >
          <IconTrain className="size-5" />
        </span>
      </div>

      {/* the words */}
      <div className="mt-3 text-center">
        {pos.arrived ? (
          <p className="font-bold">{t('journey.arrivedAt', { stop: stopName(last, lang) })}</p>
        ) : (
          <>
            <p className="font-bold">
              {t('journey.between', {
                from: stopName(pos.prev, lang),
                to: pos.next ? stopName(pos.next, lang) : '',
              })}
            </p>
            <p className="mt-0.5 text-sm text-muted">{t('journey.toNext', { n: toNext })}</p>
          </>
        )}
      </div>
    </div>
  )
}

/** "about 2.7 km" — one decimal, or none for round numbers. */
export function formatKmPerMinute(route: Region, goalMinutes: number): string {
  const v = kmPerMinute(route, goalMinutes)
  return v >= 10 ? String(Math.round(v)) : v.toFixed(1)
}
