import { useEffect, useState } from 'react'

/**
 * Returns `Date.now()`, refreshed on an interval *and* the moment the tab
 * becomes visible / focused again. The value is only used to re-render —
 * the timer's real state comes from timestamps, so a throttled interval in a
 * background tab only delays repainting, never accuracy.
 */
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const id = window.setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    window.addEventListener('pageshow', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
      window.removeEventListener('pageshow', tick)
    }
  }, [intervalMs])

  return now
}
