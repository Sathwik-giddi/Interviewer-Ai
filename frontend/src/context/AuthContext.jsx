import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

// ── Hardcoded HR credentials ──
const HR_EMAIL = 'hr@gmail.com'
const HR_PASS  = 'hr@gmail.com'
const MOCK_HR  = { uid: 'hr-admin-001', email: HR_EMAIL, displayName: 'HR Admin' }
const STORAGE_KEY = '__ai_interviewer_mock_hr__'
const ROLE_CACHE_KEY = '__ai_interviewer_roles__'

function readRoleCache() {
  try {
    return JSON.parse(localStorage.getItem(ROLE_CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeRoleCache(cache) {
  localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(cache))
}

function cacheUserRole(uid, role) {
  const cache = readRoleCache()
  cache[uid] = role
  writeRoleCache(cache)
}

function getCachedUserRole(uid) {
  const cache = readRoleCache()
  return uid ? cache[uid] || null : null
}

export function AuthProvider({ children }) {
  // Check localStorage for persisted mock HR session
  const savedMock = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null }
  })()

  const [currentUser, setCurrentUser] = useState(savedMock)
  const [userRole, setUserRole] = useState(savedMock ? 'hr' : null)
  const [loading, setLoading] = useState(!savedMock) // skip loading if mock HR restored

  async function signup(email, password, role) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    cacheUserRole(cred.user.uid, role)
    try {
      await setDoc(doc(db, 'users', cred.user.uid), {
        email,
        role,
        createdAt: new Date().toISOString(),
      })
    } catch (error) {
      // Keep signup usable if Auth succeeds but Firestore is temporarily blocked.
      console.warn('Signup profile write failed; falling back to cached role.', error)
    }
    setCurrentUser(cred.user)
    setUserRole(role)
    return cred
  }

  async function login(email, password) {
    // Hardcoded HR bypass — no Firebase needed, persists in localStorage
    if (email.toLowerCase() === HR_EMAIL && password === HR_PASS) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_HR))
      setCurrentUser(MOCK_HR)
      setUserRole('hr')
      return { cred: { user: MOCK_HR }, role: 'hr' }
    }

    const cred = await signInWithEmailAndPassword(auth, email, password)
    let role = getCachedUserRole(cred.user.uid) || 'candidate'
    try {
      const snap = await getDoc(doc(db, 'users', cred.user.uid))
      if (snap.exists()) {
        role = snap.data().role
        cacheUserRole(cred.user.uid, role)
      }
    } catch (error) {
      console.warn('Login role fetch failed; falling back to cached role.', error)
    }
    setUserRole(role)
    return { cred, role }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setCurrentUser(null)
    setUserRole(null)
    if (auth.currentUser) return signOut(auth)
    return Promise.resolve()
  }

  useEffect(() => {
    // If mock HR is already restored, don't wait for Firebase
    if (savedMock) return

    const timer = setTimeout(() => setLoading(false), 4000)

    const unsub = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timer)
      setCurrentUser(user)
      if (user) {
        const cachedRole = getCachedUserRole(user.uid)
        if (cachedRole) setUserRole(cachedRole)
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 3000)
          )
          const snap = await Promise.race([
            getDoc(doc(db, 'users', user.uid)),
            timeoutPromise,
          ])
          if (snap.exists()) {
            const role = snap.data().role
            cacheUserRole(user.uid, role)
            setUserRole(role)
          } else if (!cachedRole) {
            setUserRole('candidate')
          }
        } catch (e) {
          console.warn('Auth role fetch error (likely offline):', e)
          const path = window.location.pathname
          if (cachedRole) {
            setUserRole(cachedRole)
          } else if (path.startsWith('/hr') || path.startsWith('/observe')) {
            setUserRole('hr')
          } else {
            setUserRole('candidate')
          }
        }
      } else {
        // Don't overwrite mock HR session
        if (!localStorage.getItem(STORAGE_KEY)) {
          setUserRole(null)
        }
      }
      setLoading(false)
    })

    return () => { clearTimeout(timer); unsub() }
  }, [])

  const value = { currentUser, userRole, signup, login, logout, loading }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px', fontFamily: 'var(--font-body)' }}>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: '28px', letterSpacing: '0.06em' }}>
          AI<span style={{ color: '#7353F6' }}>INTERVIEWER</span>
        </div>
        <span style={{ width: '28px', height: '28px', border: '3px solid #EBEBEB', borderTopColor: '#7353F6', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
