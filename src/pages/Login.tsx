import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { IconGoogle, IconLogo } from '../components/icons'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { t } = useTranslation()
  const { user, loading, signingIn, signInFailed, signIn } = useAuth()

  if (!loading && user) return <Navigate to="/" replace />

  return (
    <section className="flex flex-col items-center pt-12 text-center">
      <div className="mb-6 grid size-24 place-items-center rounded-[2rem] bg-primary-soft text-primary">
        <IconLogo className="size-14" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight">{t('login.title')}</h1>
      <p className="mt-2 max-w-xs text-muted">{t('login.subtitle')}</p>

      <button
        type="button"
        onClick={() => void signIn()}
        disabled={signingIn || loading}
        className="mt-10 flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl border-2 border-field bg-surface px-6 text-lg font-bold shadow-sm transition-colors hover:bg-surface-2 disabled:opacity-60"
      >
        <IconGoogle className="size-6" />
        {signingIn ? t('login.signingIn') : t('login.google')}
      </button>

      {signInFailed && (
        <p role="alert" className="mt-4 rounded-xl bg-warm px-4 py-3 text-sm text-warm-ink">
          {t('login.error')}
        </p>
      )}

      <p className="mt-10 text-sm text-muted">{t('app.tagline')}</p>
    </section>
  )
}
