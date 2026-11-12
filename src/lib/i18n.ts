import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import th from '../locales/th.json'
import en from '../locales/en.json'

export type Lang = 'th' | 'en'
export const LANG_KEY = 'ft-lang'
export const DEFAULT_LANG: Lang = 'th'

export function isLang(value: unknown): value is Lang {
  return value === 'th' || value === 'en'
}

/** The language the user explicitly picked on this device, if any. */
export function getStoredLang(): Lang | null {
  try {
    const v = localStorage.getItem(LANG_KEY)
    return isLang(v) ? v : null
  } catch {
    return null
  }
}

void i18n.use(initReactI18next).init({
  resources: { th: { translation: th }, en: { translation: en } },
  lng: getStoredLang() ?? DEFAULT_LANG,
  fallbackLng: DEFAULT_LANG,
  interpolation: { escapeValue: false }, // React already escapes
})

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})
document.documentElement.lang = i18n.language

export function currentLang(): Lang {
  return isLang(i18n.language) ? i18n.language : DEFAULT_LANG
}

/** Switch language. `persist` marks it as an explicit user choice on this device. */
export function setLang(lang: Lang, persist = true) {
  if (persist) {
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch {
      /* private mode etc. — language still changes for this visit */
    }
  }
  void i18n.changeLanguage(lang)
}

export default i18n
