import { Navigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

export default function RequireAuth() {
  const { t } = useTranslation()
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <p className="py-24 text-center text-muted" role="status">
        {t('common.loading')}
      </p>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
