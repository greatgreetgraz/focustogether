import { useRef, useState, type PointerEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSession } from '../contexts/SessionContext'
import { useNow } from '../hooks/useNow'
import { formatClock } from '../lib/format'
import { updateSettings, useSettings, type MusicCorner } from '../lib/settings'
import { remainingMs } from '../lib/timer'
import { parseYouTube } from '../lib/youtube'

/**
 * Optional floating YouTube player. It lives in the app shell, so the music
 * keeps playing while you move between screens. It never starts by itself, and
 * YouTube requires the player to stay visible, so it can be moved and resized
 * but not hidden. While a session runs, a small timer chip sits next to it.
 */

const CORNER_CLASS: Record<MusicCorner, string> = {
  tr: 'right-3 top-[4.5rem]',
  tl: 'left-3 top-[4.5rem]',
  br: 'bottom-24 right-3',
  bl: 'bottom-24 left-3',
}
const CORNER_ORDER: MusicCorner[] = ['tr', 'br', 'bl', 'tl']

function SessionChip() {
  const { t } = useTranslation()
  const { active } = useSession()
  const now = useNow(1000)
  const { pathname } = useLocation()
  // On the Focus screen the big timer is already there.
  if (!active || pathname === '/focus') return null
  const paused = active.pausedAt != null
  return (
    <Link
      to="/focus"
      aria-label={t('music.backToFocus')}
      className={`flex min-h-10 items-center rounded-xl border-2 border-primary bg-primary-soft px-3 text-base font-extrabold tabular-nums ${
        paused ? 'opacity-70' : ''
      }`}
    >
      {formatClock(remainingMs(active, now))}
    </Link>
  )
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

export default function MusicDock() {
  const { t } = useTranslation()
  const { musicUrl, musicCorner, musicBig } = useSettings()
  const embed = parseYouTube(musicUrl)
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  if (!embed) return null

  function down(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('a,button')) return
    start.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ dx: 0, dy: 0 })
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    if (!start.current) return
    setDrag({ dx: e.clientX - start.current.x, dy: e.clientY - start.current.y })
  }
  function up(e: PointerEvent<HTMLDivElement>) {
    if (!start.current) return
    start.current = null
    setDrag(null)
    // Snap to the corner nearest to where the player was dropped.
    const box = e.currentTarget.parentElement?.getBoundingClientRect()
    if (!box) return
    const cx = box.left + box.width / 2 // the box already includes the drag offset
    const cy = box.top + box.height / 2
    const right = cx > window.innerWidth / 2
    const bottom = cy > window.innerHeight / 2
    updateSettings({ musicCorner: bottom ? (right ? 'br' : 'bl') : right ? 'tr' : 'tl' })
  }
  function cycle() {
    const i = CORNER_ORDER.indexOf(musicCorner)
    updateSettings({ musicCorner: CORNER_ORDER[(i + 1) % CORNER_ORDER.length] })
  }

  return (
    <div
      className={`fixed z-20 flex flex-col gap-2 rounded-2xl border border-line bg-surface p-2 shadow-lg ${CORNER_CLASS[musicCorner]}`}
      style={{
        width: musicBig ? 'min(18rem, calc(100vw - 1.5rem))' : '13rem',
        transform: drag ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined,
        transition: drag ? 'none' : undefined,
      }}
    >
      <div className="flex items-center gap-2">
        <div
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          title={t('music.drag')}
          aria-hidden="true"
          className="flex min-h-10 flex-1 cursor-grab touch-none select-none items-center justify-center rounded-xl text-muted active:cursor-grabbing"
        >
          <Icon d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" />
        </div>
        <SessionChip />
        <button
          type="button"
          onClick={cycle}
          aria-label={t('music.move')}
          title={t('music.move')}
          className="grid size-10 place-items-center rounded-xl border-2 border-field hover:bg-surface-2"
        >
          <Icon d="M5 9l-3 3 3 3M19 9l3 3-3 3M9 5l3-3 3 3M9 19l3 3 3-3M2 12h20M12 2v20" />
        </button>
        <button
          type="button"
          onClick={() => updateSettings({ musicBig: !musicBig })}
          aria-label={musicBig ? t('music.smaller') : t('music.bigger')}
          title={musicBig ? t('music.smaller') : t('music.bigger')}
          className="grid size-10 place-items-center rounded-xl border-2 border-field hover:bg-surface-2"
        >
          <Icon d={musicBig ? 'M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7' : 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7'} />
        </button>
      </div>
      <div className="overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '16 / 9' }}>
        <iframe
          title={t('music.playerTitle')}
          src={embed.src}
          className="size-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  )
}
