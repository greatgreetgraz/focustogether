import i18n from './i18n'
import { getSettings } from './settings'

/**
 * The "time's up" signal: a soft two-note chime (never an alarm) and, if the
 * user opted in, a quiet browser notification while the tab is in the background.
 *
 * Why the chime is scheduled on the *audio clock*: background tabs throttle
 * setTimeout / setInterval (sometimes to once a minute), but sound scheduled
 * ahead of time on a running AudioContext plays at its exact moment. The tick
 * in the Focus screen is only a fallback (see ensureEndChime).
 */

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

let ctx: AudioContext | null = null
/** One chime: its oscillators plus a gain we can fade, so it never has to be cut off abruptly. */
interface Chime {
  out: GainNode
  nodes: AudioNode[]
}

let pending: { startAt: number; chime: Chime } | null = null
/** The last chime from "Try it", faded out if the button is pressed again. */
let lastPreview: Chime | null = null
/** Shared output stage: master level, then a limiter so overlapping chimes can never clip. */
let bus: AudioNode | null = null

function getCtx(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
  } catch {
    return null
  }
  bus = makeBus(ctx)
  return ctx
}

function makeBus(c: AudioContext): AudioNode {
  const master = c.createGain()
  master.gain.value = 0.36
  try {
    const limiter = c.createDynamicsCompressor()
    limiter.threshold.value = -14
    limiter.knee.value = 10
    limiter.ratio.value = 12
    limiter.attack.value = 0.003
    limiter.release.value = 0.25
    master.connect(limiter).connect(c.destination)
  } catch {
    master.connect(c.destination)
  }
  return master
}

/** Browsers only let audio start after a tap / key press, so we unlock it on the first one. */
export function unlockAudio(): void {
  const c = getCtx()
  if (c && c.state !== 'running') void c.resume().catch(() => undefined)
}

for (const ev of ['pointerdown', 'keydown', 'touchend'] as const) {
  window.addEventListener(ev, unlockAudio, { passive: true })
}

const CHIME_SECONDS = 2.2
const ATTACK_SECONDS = 0.05

/**
 * One smooth gain curve per note: a raised-cosine attack (no sharp corner, so no
 * tick) followed by an exponential-style decay that lands on exactly 0 (so there
 * is no click when the oscillator stops).
 */
function envelopeCurve(peak: number): Float32Array {
  const n = 256
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * CHIME_SECONDS
    let g: number
    if (t < ATTACK_SECONDS) {
      g = peak * 0.5 * (1 - Math.cos((Math.PI * t) / ATTACK_SECONDS))
    } else {
      const d = (t - ATTACK_SECONDS) / (CHIME_SECONDS - ATTACK_SECONDS) // 0 → 1
      g = peak * Math.exp(-6 * d) * (1 - d) // reaches 0 smoothly at the end
    }
    curve[i] = g
  }
  curve[n - 1] = 0
  return curve
}

/**
 * C5 then E5: a soft attack and a long fade. Each note is a sine plus a quieter
 * octave above it, which makes it a gentle bell and keeps it audible on small
 * laptop / phone speakers (a pure low sine can all but vanish there).
 */
function buildChime(c: AudioContext, at: number): Chime {
  const out = c.createGain()
  out.connect(bus ?? c.destination)
  const nodes: AudioNode[] = [out]
  for (const { freq, offset } of [
    { freq: 523.25, offset: 0 },
    { freq: 659.25, offset: 0.3 },
  ]) {
    for (const { mult, peak } of [
      { mult: 1, peak: 0.3 },
      { mult: 2, peak: 0.09 },
    ]) {
      const osc = c.createOscillator()
      const gain = c.createGain()
      const start = at + offset
      osc.type = 'sine'
      osc.frequency.value = freq * mult
      gain.gain.setValueAtTime(0, start)
      gain.gain.setValueCurveAtTime(envelopeCurve(peak), start, CHIME_SECONDS)
      osc.connect(gain).connect(out)
      osc.start(start)
      osc.stop(start + CHIME_SECONDS + 0.05)
      nodes.push(osc, gain)
    }
  }
  return { out, nodes }
}

/** Fade a chime out quickly (about 0.15 s) instead of cutting it off, then free it. */
function fadeOutChime(chime: Chime): void {
  const c = ctx
  const now = c ? c.currentTime : 0
  try {
    chime.out.gain.cancelScheduledValues(now)
    chime.out.gain.setTargetAtTime(0, now, 0.03)
  } catch {
    /* ignore */
  }
  for (const n of chime.nodes) {
    try {
      if (n instanceof OscillatorNode) n.stop(now + 0.2)
    } catch {
      /* already stopped */
    }
  }
  setTimeout(() => {
    for (const n of chime.nodes) {
      try {
        n.disconnect()
      } catch {
        /* already disconnected */
      }
    }
  }, 400)
}

export function cancelEndChime(): void {
  if (pending) fadeOutChime(pending.chime)
  pending = null
}

/** Schedule the chime for an absolute time (epoch ms). Replaces any earlier schedule. */
export function scheduleEndChimeAt(endEpochMs: number): void {
  cancelEndChime()
  if (!getSettings().sound) return
  const c = getCtx()
  if (!c) return

  const place = () => {
    // Re-check: it may have been cancelled / replaced while resuming.
    if (c.state !== 'running') return
    const delay = (endEpochMs - Date.now()) / 1000
    if (delay < -1) return // already long past — the Focus tick handles it
    cancelEndChime()
    const startAt = c.currentTime + Math.max(0.02, delay)
    pending = { startAt, chime: buildChime(c, startAt) }
  }

  if (c.state === 'running') place()
  else void c.resume().then(place, () => undefined)
}

function endChimeStarted(): boolean {
  return Boolean(pending && ctx && ctx.state === 'running' && ctx.currentTime >= pending.startAt - 0.05)
}

/**
 * Called when the session completes. If the pre-scheduled chime already
 * started (or is about to), leave it alone; otherwise play it now.
 */
export function ensureEndChime(): void {
  if (!getSettings().sound) {
    cancelEndChime()
    return
  }
  if (endChimeStarted()) {
    pending = null // let it finish playing
    return
  }
  cancelEndChime()
  const c = getCtx()
  if (!c) return
  const playNow = () => {
    buildChime(c, c.currentTime + 0.02)
  }
  if (c.state === 'running') playNow()
  else void c.resume().then(playNow, () => undefined)
}

function isRunning(c: AudioContext): boolean {
  return c.state === 'running'
}

/**
 * For the "Try it" button in Settings (always plays, regardless of the sound
 * setting). Reports what happened so the button can say so.
 */
export async function previewChime(): Promise<'ok' | 'blocked' | 'unsupported'> {
  const c = getCtx()
  if (!c) return 'unsupported'
  if (!isRunning(c)) {
    try {
      await c.resume()
    } catch {
      /* handled below */
    }
  }
  if (!isRunning(c)) return 'blocked'
  if (lastPreview) fadeOutChime(lastPreview)
  lastPreview = buildChime(c, c.currentTime + 0.05)
  return 'ok'
}

// ---------------------------------------------------------------- notifications

export type NotifySupport = 'unsupported' | NotificationPermission

export function notifySupport(): NotifySupport {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

/** Must be called from a tap / click. Resolves with the resulting permission. */
export async function requestNotifyPermission(): Promise<NotifySupport> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/** A quiet notification, only when the tab isn't being looked at. */
export function notifySessionEnd(task: string, minutes: number): void {
  if (!getSettings().notify) return
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  if (document.visibilityState === 'visible') return

  const title = i18n.t('notify.title')
  const body = i18n.t('notify.body', {
    task: task || i18n.t('common.untitledTask'),
    n: Math.round(minutes),
  })
  const options: NotificationOptions = {
    body,
    icon: '/pwa-192x192.png',
    tag: 'ft-session-end',
    silent: true, // the chime already covers sound; no extra alert noise
  }

  const fallback = () => {
    try {
      const n = new Notification(title, options)
      n.onclick = () => {
        window.focus()
        n.close()
      }
    } catch {
      /* some mobile browsers only allow service-worker notifications */
    }
  }

  const sw = navigator.serviceWorker
  if (!sw) return fallback()
  sw.getRegistration().then(
    (reg) => (reg ? reg.showNotification(title, options) : fallback()),
    fallback,
  )
}
