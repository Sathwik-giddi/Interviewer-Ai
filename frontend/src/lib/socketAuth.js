import { auth } from '../firebase'
import { signInAnonymously, getIdToken, onAuthStateChanged } from 'firebase/auth'

function waitForAuthUser(timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsub()
      reject(new Error('Timed out waiting for Firebase auth state'))
    }, timeoutMs)
    const unsub = onAuthStateChanged(auth, (user) => {
      clearTimeout(timer)
      unsub()
      resolve(user)
    }, (error) => {
      clearTimeout(timer)
      unsub()
      reject(error)
    })
  })
}

export async function getSocketAuthToken(currentUser) {
  if (currentUser && typeof currentUser.getIdToken === 'function') {
    try {
      // Force token refresh to avoid using expired cached tokens
      const token = await getIdToken(currentUser, true)
      if (token) return { uid: currentUser.uid, token }
    } catch (err) {
      console.warn('[SocketAuth] Failed to get ID token (will try anonymous):', err.message)
    }
  }

  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth)
    }
    const user = await waitForAuthUser()
    if (!user) throw new Error('Anonymous sign-in did not produce a user')
    const token = await getIdToken(user, true)
    return { uid: user.uid, token }
  } catch (err) {
    console.error('[SocketAuth] All auth methods failed:', err.message)
    return null
  }
}

export async function getSocketAuth(currentUser) {
  const authData = await getSocketAuthToken(currentUser)
  if (!authData?.token || !authData?.uid) {
    throw new Error('Unable to obtain authentication token. Please check your internet connection and try again.')
  }
  return authData
}
