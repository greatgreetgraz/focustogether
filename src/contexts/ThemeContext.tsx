import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { trackEvent } from '../lib/analytics'

type Theme = 'light' | 'dark'
const THEME_KEY = 'ft-theme'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeState | null>(null)

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document
    .getElementById('theme-color-meta')
    ?.setAttribute('content', theme === 'dark' ? '#14181C' : '#F6F4EF')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // index.html already applied the saved / system theme before first paint.
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      try {
        localStorage.setItem(THEME_KEY, next)
      } catch {
        /* ignore */
      }
      trackEvent('theme_change', { theme: next })
      return next
    })
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
