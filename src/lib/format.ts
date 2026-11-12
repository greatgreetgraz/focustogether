import type { TFunction } from 'i18next'

/** "24:07", or "1:05:00" for sessions of an hour or more. Rounds up so it reaches 00:00 only at the end. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Human duration in the active language: "<1 min", "25 min", "1 h 5 min". */
export function formatDuration(t: TFunction, minutes: number): string {
  const m = Math.round(minutes)
  if (m < 1) return t('time.lessThanMinute')
  if (m < 60) return t('time.minutes', { n: m })
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest === 0 ? t('time.hours', { h }) : t('time.hoursMinutes', { h, m: rest })
}

function locale(lang: string): string {
  return lang === 'th' ? 'th-TH' : 'en-GB'
}

export function formatTime(date: Date, lang: string): string {
  return new Intl.DateTimeFormat(locale(lang), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/** "Today" / "Yesterday" / "Wed 14 Oct" (adds the year if it isn't this year). */
export function formatDayLabel(date: Date, t: TFunction, lang: string, now = new Date()): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86_400_000)
  if (diffDays === 0) return t('history.today')
  if (diffDays === 1) return t('history.yesterday')
  return new Intl.DateTimeFormat(locale(lang), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}),
  }).format(date)
}

/** Deterministically pick one message so it doesn't change on re-render. */
export function pickMessage(messages: unknown, seed: string): string {
  if (!Array.isArray(messages) || messages.length === 0) return ''
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return String(messages[hash % messages.length])
}
