import { useTranslation } from 'react-i18next'
import Header from '../components/Header'

/** Shown instead of the app when the Firebase .env values are missing. */
export default function SetupNeeded() {
  const { t } = useTranslation()
  return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto max-w-md px-5 pt-16 text-center">
        <h1 className="text-2xl font-extrabold">{t('setup.title')}</h1>
        <p className="mt-3 text-muted">{t('setup.body')}</p>
      </main>
    </div>
  )
}
