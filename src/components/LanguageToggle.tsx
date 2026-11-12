import { useTranslation } from 'react-i18next'
import { useAuthOptional } from '../contexts/AuthContext'
import { trackEvent } from '../lib/analytics'
import { currentLang, setLang, type Lang } from '../lib/i18n'
import { saveUserLanguage } from '../lib/user'

const OPTIONS: { lang: Lang; label: string; aria: string }[] = [
  { lang: 'th', label: 'ไทย', aria: 'ภาษาไทย' },
  { lang: 'en', label: 'EN', aria: 'English' },
]

export default function LanguageToggle() {
  const { t, i18n } = useTranslation()
  const user = useAuthOptional()?.user ?? null
  const active = i18n.language === 'en' ? 'en' : 'th'

  function choose(lang: Lang) {
    if (lang === currentLang()) return
    setLang(lang)
    trackEvent('language_change', { language: lang })
    if (user) void saveUserLanguage(user.uid, lang)
  }

  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className="flex rounded-full bg-surface-2 p-1"
    >
      {OPTIONS.map(({ lang, label, aria }) => (
        <button
          key={lang}
          type="button"
          lang={lang}
          aria-label={aria}
          aria-pressed={active === lang}
          onClick={() => choose(lang)}
          className={`min-h-10 min-w-12 rounded-full px-3 text-sm font-bold transition-colors ${
            active === lang ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
