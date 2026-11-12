import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from './firebase'
import { currentLang, getStoredLang, isLang, setLang, type Lang } from './i18n'

/**
 * Create or refresh `users/{uid}` after sign-in.
 * Language: a choice made explicitly on this device wins; otherwise a language
 * saved on the account (from another device) is applied.
 */
export async function syncUserProfile(user: User): Promise<void> {
  const ref = doc(db, 'users', user.uid)
  const displayName = user.displayName ?? null
  const photoURL = user.photoURL ?? null
  try {
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, {
        displayName,
        photoURL,
        createdAt: serverTimestamp(),
        language: currentLang(),
      })
      return
    }

    const data = snap.data()
    const patch: Record<string, unknown> = {}
    if (data.displayName !== displayName) patch.displayName = displayName
    if (data.photoURL !== photoURL) patch.photoURL = photoURL

    const stored = getStoredLang()
    if (stored) {
      if (data.language !== stored) patch.language = stored
    } else if (isLang(data.language) && data.language !== currentLang()) {
      setLang(data.language, false)
    }

    if (Object.keys(patch).length > 0) await updateDoc(ref, patch)
  } catch (err) {
    // Offline or transient — the app works without the profile doc.
    console.warn('syncUserProfile failed', err)
  }
}

export async function saveUserLanguage(uid: string, language: Lang): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), { language })
  } catch (err) {
    console.warn('saveUserLanguage failed', err)
  }
}
