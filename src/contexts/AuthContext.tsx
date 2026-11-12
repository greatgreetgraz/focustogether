import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { syncUserProfile } from '../lib/user'

interface AuthState {
  user: User | null
  /** true until Firebase has told us whether someone is signed in */
  loading: boolean
  signingIn: boolean
  signInFailed: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [signInFailed, setSignInFailed] = useState(false)

  useEffect(() => {
    // Surfaces errors from a redirect-based sign-in (the popup fallback).
    getRedirectResult(auth).catch(() => setSignInFailed(true))

    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
      if (u) void syncUserProfile(u)
    })
  }, [])

  const signIn = useCallback(async () => {
    setSignInFailed(false)
    setSigningIn(true)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        // Some mobile / in-app browsers block popups — fall back to a full-page redirect.
        await signInWithRedirect(auth, googleProvider)
        return
      }
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        console.error('Sign-in failed', err)
        setSignInFailed(true)
      }
    } finally {
      setSigningIn(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
  }, [])

  const value = useMemo(
    () => ({ user, loading, signingIn, signInFailed, signIn, signOut }),
    [user, loading, signingIn, signInFailed, signIn, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Like useAuth, but returns null instead of throwing when there is no <AuthProvider> (setup screen). */
export function useAuthOptional(): AuthState | null {
  return useContext(AuthContext)
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
