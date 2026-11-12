import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useSession } from '../contexts/SessionContext'
import { formatClock } from '../lib/format'
import { useSettings } from '../lib/settings'
import { remainingMs } from '../lib/timer'
import { parseYouTube } from '../lib/youtube'

/**
 * Optional YouTube player for the Focus screen. It never starts by itself (the
 * person taps play inside the player). YouTube requires the player to stay
 * visible, so "Smaller" shrinks it instead of hiding it.
 *
 * "Pop out" (desktop Chrome / Edge, via the Document Picture-in-Picture API)
 * moves the player and the timer into a small always-on-top window, so they stay
 * visible over other apps and tabs. Leaving the Focus screen stops the music and
 * closes that window.
 */

interface PipApi {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>
}

function pipApi(): PipApi | null {
  return (window as unknown as { documentPictureInPicture?: PipApi }).documentPictureInPicture ?? null
}

/** The floating window starts empty: give it the app's styles and theme. */
function copyStyles(from: Document, to: Document) {
  for (const sheet of Array.from(from.styleSheets)) {
    try {
      const style = to.createElement('style')
      style.textContent = Array.from(sheet.cssRules)
        .map((r) => r.cssText)
        .join('\n')
      to.head.appendChild(style)
    } catch {
      if (sheet.href) {
        const link = to.createElement('link')
        link.rel = 'stylesheet'
        link.href = sheet.href
        to.head.appendChild(link)
      }
    }
  }
  to.documentElement.className = from.documentElement.className
  to.documentElement.lang = from.documentElement.lang
}

function Player({ src, title }: { src: string; title: string }) {
  return (
    <iframe
      title={title}
      src={src}
      className="size-full"
      allow="autoplay; encrypted-media; picture-in-picture"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  )
}

/** What the floating window shows: the timer (while a session runs) and the player. */
function FloatingView({ win, src }: { win: Window; src: string }) {
  const { t } = useTranslation()
  const { active, pause, resume } = useSession()
  const [now, setNow] = useState(() => Date.now())
  // The floating window's own timer: it keeps ticking while the main tab is in the background.
  useEffect(() => {
    const id = win.setInterval(() => setNow(Date.now()), 500)
    return () => win.clearInterval(id)
  }, [win])
  const paused = active?.pausedAt != null

  return (
    <div className="flex h-dvh flex-col gap-2 bg-bg p-2 text-ink">
      {active && (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-3xl font-extrabold leading-none tabular-nums">
              {formatClock(remainingMs(active, now))}
            </p>
            <p className="mt-1 truncate text-xs text-muted">
              {active.task || t('common.untitledTask')}
            </p>
          </div>
          <button
            type="button"
            onClick={paused ? resume : pause}
            className="min-h-11 shrink-0 rounded-xl border-2 border-primary bg-primary-soft px-4 text-sm font-bold"
          >
            {paused ? t('focus.resume') : t('focus.pause')}
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl bg-black">
        <Player src={src} title={t('music.playerTitle')} />
      </div>
    </div>
  )
}

export default function MusicPanel() {
  const { t } = useTranslation()
  const { musicUrl } = useSettings()
  const [big, setBig] = useState(false)
  const [pip, setPip] = useState<Window | null>(null)
  const pipRef = useRef<Window | null>(null)
  const embed = parseYouTube(musicUrl)
  const canPop = pipApi() !== null

  // Closing the panel (leaving the Focus screen) or removing the link closes the floating window.
  useEffect(() => () => pipRef.current?.close(), [])
  useEffect(() => {
    if (!embed) pipRef.current?.close()
  }, [embed])

  async function popOut() {
    const api = pipApi()
    if (!api) return
    try {
      const win = await api.requestWindow({ width: 340, height: 290 })
      copyStyles(document, win.document)
      win.document.title = 'FocusTogether'
      win.addEventListener('pagehide', () => {
        pipRef.current = null
        setPip(null)
      })
      pipRef.current = win
      setPip(win)
    } catch {
      /* the browser refused (no user gesture, or not allowed): the panel stays as it is */
    }
  }

  if (!embed) return null

  return (
    <div className="w-full rounded-2xl bg-surface p-3 text-left">
      <div className="flex items-center justify-between gap-3 pb-2">
        <p className="px-1 text-sm font-bold text-muted">{t('music.title')}</p>
        <div className="flex gap-2">
          {canPop && (
            <button
              type="button"
              onClick={() => (pip ? pip.close() : void popOut())}
              className="min-h-11 rounded-xl border-2 border-primary bg-primary-soft px-3 text-sm font-bold hover:brightness-95"
            >
              {pip ? t('music.popIn') : t('music.popOut')}
            </button>
          )}
          {!pip && (
            <button
              type="button"
              onClick={() => setBig((b) => !b)}
              className="min-h-11 rounded-xl border-2 border-field px-3 text-sm font-bold hover:bg-surface-2"
            >
              {big ? t('music.smaller') : t('music.bigger')}
            </button>
          )}
        </div>
      </div>

      {pip ? (
        <>
          <p className="rounded-xl bg-primary-soft px-3 py-3 text-sm">{t('music.poppedOut')}</p>
          {createPortal(<FloatingView win={pip} src={embed.src} />, pip.document.body)}
        </>
      ) : (
        <>
          <div
            className={`mx-auto overflow-hidden rounded-xl bg-black ${big ? 'w-full' : 'w-52'}`}
            style={{ aspectRatio: '16 / 9' }}
          >
            <Player src={embed.src} title={t('music.playerTitle')} />
          </div>
          <p className="px-1 pt-2 text-xs text-muted">
            {t('music.tapPlay')}
            {canPop && ` ${t('music.popHint')}`}
          </p>
        </>
      )}
    </div>
  )
}
