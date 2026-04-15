import { auth } from '../firebase'
import { signInAnonymously, getIdToken } from 'firebase/auth'

export async function getSocketAuthToken(currentUser) {
  if (currentUser && typeof currentUser.getIdToken === 'function') {
    try {
      return await getIdToken(currentUser)
    } catch (err) {
      console.warn('[SocketAuth] Failed to get ID token:', err.message)
      return null
    }
  }

  try {
    const cred = await signInAnonymously(auth)
    return await getIdToken(cred.user)
  } catch (err) {
    console.warn('[SocketAuth] Anonymous sign-in failed:', err.message)
    return null
  }
}

export async function getSocketAuth(currentUser) {
  const token = await getSocketAuthToken(currentUser)
  return { token }
}
