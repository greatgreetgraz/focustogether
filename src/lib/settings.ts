import { useSyncExternalStore } from 'react'

export type TimerStyle = 'ring' | 'disc'

export interface Settings {
  /** Soft chime when a session reaches zero. */
  sound: boolean
  /** Browser notification when a session ends while the tab is in the background. */
  notify: boolean
  /** "ring" = thick progress ring, "disc" = shrinking filled wedge (like a Time Timer). */
  timerStyle: TimerStyle
  /** Hide the numbers and just show the shape. Tap the timer to toggle during a session. */
  hideDigits: boolean
  /** Show the journey strip on the Focus screen (when you've chosen a journey). */
  showJourney: boolean
  /** A YouTube video/playlist link for the optional music player on the Focus screen ('' = none). */
  musicUrl: string
}

const KEY = 'ft-settings'

const DEFAULTS: Settings = {
  sound: true,
  notify: false, // needs the browser's permission, so it's opt-in
  timerStyle: 'ring',
  hideDigits: false,
  showJourney: true,
  musicUrl: '',
}

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    const p = JSON.parse(raw) as Partial<Settings>
    return {
      sound: typeof p.sound === 'boolean' ? p.sound : DEFAULTS.sound,
      notify: typeof p.notify === 'boolean' ? p.notify : DEFAULTS.notify,
      timerStyle: p.timerStyle === 'disc' ? 'disc' : 'ring',
      hideDigits: typeof p.hideDigits === 'boolean' ? p.hideDigits : DEFAULTS.hideDigits,
      showJourney: typeof p.showJourney === 'boolean' ? p.showJourney : DEFAULTS.showJourney,
      musicUrl: typeof p.musicUrl === 'string' ? p.musicUrl.slice(0, 300) : DEFAULTS.musicUrl,
    }
  } catch {
    return DEFAULTS
  }
}

let current: Settings = read()
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function getSettings(): Settings {
  return current
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* storage unavailable — setting still applies for this visit */
  }
  emit()
}

// Keep several open tabs in sync.
window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    current = read()
    emit()
  }
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings)
}
