import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { IconHome, IconList, IconSliders } from './icons'

export default function TabBar() {
  const { t } = useTranslation()
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex h-16 flex-1 flex-col items-center justify-center gap-0.5 text-sm font-bold transition-colors ${
      isActive ? 'text-primary' : 'text-muted hover:text-ink'
    }`

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md">
        <NavLink to="/" end className={link}>
          <IconHome className="size-6" />
          {t('common.home')}
        </NavLink>
        <NavLink to="/history" className={link}>
          <IconList className="size-6" />
          {t('common.history')}
        </NavLink>
        <NavLink to="/settings" className={link}>
          <IconSliders className="size-6" />
          {t('common.settings')}
        </NavLink>
      </div>
    </nav>
  )
}
