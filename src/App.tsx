import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import { AuthProvider } from './contexts/AuthContext'
import { SessionProvider } from './contexts/SessionContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { TripProvider } from './contexts/TripContext'
import { firebaseConfigured } from './lib/firebase'
import End from './pages/End'
import Focus from './pages/Focus'
import History from './pages/History'
import Home from './pages/Home'
import Journey from './pages/Journey'
import Login from './pages/Login'
import Settings from './pages/Settings'
import SetupNeeded from './pages/SetupNeeded'

export default function App() {
  if (!firebaseConfigured) {
    return (
      <ThemeProvider>
        <SetupNeeded />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <TripProvider>
          <SessionProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/login" element={<Login />} />
                <Route element={<RequireAuth />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/focus" element={<Focus />} />
                  <Route path="/end" element={<End />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/journey" element={<Journey />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </SessionProvider>
        </TripProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
