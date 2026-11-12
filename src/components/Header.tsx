import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageToggle from './LanguageToggle'
import { IconLogo, IconMoon, IconSun } from './icons'
import { useAuthOptional } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

function AccountMenu() {
  const { t } = useTranslation()
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const signOut = auth?.signOut
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null
  const initial = (user.displayName ?? user.email ?? '?').trim().charAt(0).toUpperCase()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t('common.account')}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center overflow-hidden rounded-full bg-primary-soft font-bold text-ink"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="size-full object-cover"
          />
        ) : (
          initial
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-13 z-20 w-56 rounded-2xl border border-line bg-surface p-2 shadow-lg">
          <p className="truncate px-3 py-2 text-sm text-muted">{user.displayName ?? user.email}</p>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              void signOut?.()
            }}
            className="min-h-12 w-full rounded-xl px-3 text-left font-semibold hover:bg-surface-2"
          >
            {t('common.signOut')}
          </button>
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const focusing = pathname === '/focus'

  // While focusing, nothing but the timer competes for attention: no toggles, no menu.
  if (focusing) return <div aria-hidden="true" className="h-4 pt-[env(safe-area-inset-top)]" />

  return (
    <header className="sticky top-0 z-10 bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-md items-center gap-2 px-4">
        <Link to="/" className="flex min-h-11 items-center gap-2 text-primary">
          <IconLogo className="size-8" />
          <span className="hidden text-lg font-extrabold tracking-tight text-ink min-[380px]:inline">
            {t('app.name')}
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <LanguageToggle />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('common.switchToLight') : t('common.switchToDark')}
            className="grid size-11 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
          >
            {theme === 'dark' ? <IconSun className="size-6" /> : <IconMoon className="size-6" />}
          </button>
          <AccountMenu />
        </div>
      </div>
    </header>
  )
}
