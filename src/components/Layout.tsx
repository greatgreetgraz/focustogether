import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import TabBar from './TabBar'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  // Keep the focus + end screens free of navigation distractions.
  const showTabs = Boolean(user) && pathname !== '/focus' && pathname !== '/end'

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className={`mx-auto w-full max-w-md flex-1 px-5 pt-4 ${showTabs ? 'pb-28' : 'pb-10'}`}>
        <Outlet />
      </main>
      {showTabs && <TabBar />}
    </div>
  )
}
