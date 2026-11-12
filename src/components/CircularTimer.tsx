import type { ReactNode } from 'react'

interface Props {
  /** Fraction of the session still remaining, 0–1. The ring empties as time passes. */
  ratio: number
  children: ReactNode
}

const RADIUS = 92
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function CircularTimer({ ratio, children }: Props) {
  const r = Math.min(1, Math.max(0, ratio))
  return (
    <div className="relative mx-auto aspect-square w-[min(78vw,20rem)]">
      <svg viewBox="0 0 208 208" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="104" cy="104" r={RADIUS} fill="none" strokeWidth="12" className="stroke-track" />
        <circle
          cx="104"
          cy="104"
          r={RADIUS}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - r)}
          style={{ opacity: r > 0 ? 1 : 0, transition: 'stroke-dashoffset 300ms linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        {children}
      </div>
    </div>
  )
}
