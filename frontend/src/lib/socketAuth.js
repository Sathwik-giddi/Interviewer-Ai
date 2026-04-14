/**
 * socketAuth — Utility for obtaining Firebase ID tokens for Socket.io authentication
 *
 * Handles three cases:
 * 1. Real Firebase user → getIdToken()
 * 2. Mock HR user → fetch custom token from server, sign in, then getIdToken()
 * 3. Anonymous/guest → signInAnonymously(), then getIdToken()
 */
import { auth } from '../firebase'
import { signInAnonymously, signInWithCustomToken, getIdToken } from 'firebase/auth'
import { getSocketServerUrl } from './runtimeConfig'

const MOCK_HR_STORAGE_KEY = '__ai_interviewer_mock_hr__'

/**
 * Get a Firebase ID token for Socket.io auth.
 * @param {object} currentUser - The currentUser from AuthContext
 * @returns {Promise<string|null>} ID token or null if unavailable
 */
export async function getSocketAuthToken(currentUser) {
  // Case 1: Real Firebase user with getIdToken
  if (currentUser && typeof currentUser.getIdToken === 'function') {
    try {
      return await getIdToken(currentUser)
    } catch (err) {
      console.warn('[SocketAuth] Failed to get ID token:', err.message)
      return null
    }
  }

  // Case 2: Mock HR user — needs to sign in via custom token
  const mockData = (() => {
    try { return JSON.parse(localStorage.getItem(MOCK_HR_STORAGE_KEY)) } catch { return null }
  })()

  if (mockData && mockData.uid) {
    try {
      // Check if Firebase already has this user signed in
      if (auth.currentUser) {
        return await getIdToken(auth.currentUser)
      }

      // Need to sign in via custom token — this requires DEMO_HR_SECRET
      // The secret is stored in frontend env for simplicity
      const demoSecret = import.meta.env.VITE_DEMO_HR_SECRET
      if (!demoSecret) {
        console.warn('[SocketAuth] VITE_DEMO_HR_SECRET not set — mock HR cannot authenticate with signaling server')
        return null
      }

      const signalingUrl = getSocketServerUrl() || ''
      const res = await fetch(`${signalingUrl}/api/auth/custom-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: demoSecret }),
      })

      if (res.ok) {
        const { customToken } = await res.json()
        const cred = await signInWithCustomToken(auth, customToken)
        return await getIdToken(cred.user)
      }
      console.warn('[SocketAuth] Custom token fetch failed:', res.status)
      return null
    } catch (err) {
      console.warn('[SocketAuth] Mock HR sign-in failed:', err.message)
      return null
    }
  }

  // Case 3: Anonymous — sign in anonymously and get token
  try {
    const cred = await signInAnonymously(auth)
    return await getIdToken(cred.user)
  } catch (err) {
    console.warn('[SocketAuth] Anonymous sign-in failed:', err.message)
    return null
  }
}

/**
 * Create socket auth options with a Firebase ID token
 * @param {object} currentUser - The currentUser from AuthContext
 * @returns {Promise<object>} Socket.io auth options
 */
export async function getSocketAuth(currentUser) {
  const token = await getSocketAuthToken(currentUser)
  return { token }
}