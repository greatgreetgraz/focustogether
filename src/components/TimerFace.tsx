import type { TimerStyle } from '../lib/settings'

interface Props {
  /** Fraction of the session still remaining, 0–1. The shape shrinks as time passes. */
  ratio: number
  style: TimerStyle
  /** Visually hide the numbers (they stay available to screen readers). */
  hideDigits: boolean
  clock: string
  subLabel: string
  /** Just the shape, no text — used for the previews in Settings. */
  compact?: boolean
}

// All drawing happens in a 208x208 box.
const SIZE = 208
const C = SIZE / 2

// Ring style: thick on purpose, so the shape is the first thing you see.
const RING_STROKE = 24
const RING_R = 88
const RING_LEN = 2 * Math.PI * RING_R

// Disc style: a filled wedge that shrinks, like a Time Timer.
const DISC_R = 96

function wedgePath(ratio: number): string {
  const a = ratio * 2 * Math.PI // clockwise from 12 o'clock
  const x = C + DISC_R * Math.sin(a)
  const y = C - DISC_R * Math.cos(a)
  const large = ratio > 0.5 ? 1 : 0
  return `M ${C} ${C} L ${C} ${C - DISC_R} A ${DISC_R} ${DISC_R} 0 ${large} 1 ${x} ${y} Z`
}

function Graphic({ ratio, style }: { ratio: number; style: TimerStyle }) {
  const r = Math.min(1, Math.max(0, ratio))

  if (style === 'disc') {
    return (
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="block size-full" aria-hidden="true">
        <circle cx={C} cy={C} r={DISC_R} className="fill-track stroke-field" strokeWidth="2" />
        {r >= 0.999 ? (
          <circle cx={C} cy={C} r={DISC_R} className="fill-primary" />
        ) : r > 0 ? (
          <path d={wedgePath(r)} className="fill-primary" />
        ) : null}
      </svg>
    )
  }

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="block size-full -rotate-90" aria-hidden="true">
      <circle
        cx={C}
        cy={C}
        r={RING_R}
        fill="none"
        strokeWidth={RING_STROKE}
        className="stroke-track"
      />
      <circle
        cx={C}
        cy={C}
        r={RING_R}
        fill="none"
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        className="stroke-primary"
        strokeDasharray={RING_LEN}
        strokeDashoffset={RING_LEN * (1 - r)}
        style={{ opacity: r > 0 ? 1 : 0, transition: 'stroke-dashoffset 300ms linear' }}
      />
    </svg>
  )
}

/**
 * The timer picture. Uses <span>s only, so it can sit inside a <button>
 * (tapping it toggles the numbers).
 */
export default function TimerFace({ ratio, style, hideDigits, clock, subLabel, compact }: Props) {
  if (compact) {
    return (
      <span className="block aspect-square w-full">
        <Graphic ratio={ratio} style={style} />
      </span>
    )
  }

  const digits = (
    <span
      role="timer"
      className={
        hideDigits
          ? 'sr-only'
          : style === 'disc'
            ? 'block text-6xl font-extrabold tabular-nums tracking-tight'
            : 'block text-6xl font-extrabold tabular-nums tracking-tight'
      }
    >
      {clock}
    </span>
  )

  if (style === 'disc') {
    return (
      <span className="flex flex-col items-center gap-5">
        <span className="block aspect-square w-[min(72vw,18rem)]">
          <Graphic ratio={ratio} style={style} />
        </span>
        <span className="flex flex-col items-center">
          {digits}
          <span className="mt-1 block text-sm text-muted">{subLabel}</span>
        </span>
      </span>
    )
  }

  return (
    <span className="relative mx-auto block aspect-square w-[min(78vw,20rem)]">
      <Graphic ratio={ratio} style={style} />
      <span className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
        {digits}
        <span className="mt-2 block text-sm text-muted">{subLabel}</span>
      </span>
    </span>
  )
}
