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

async function fetchUserRole(uid, timeoutMs = 3000) {
  if (!uid) return null
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Role lookup timed out')), timeoutMs)
  )
  const snap = await Promise.race([
    getDoc(doc(db, 'users', uid)),
    timeoutPromise,
  ])
  return snap.exists() ? snap.data().role || null : null
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  async function signup(email, password, role) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    try {
      await setDoc(doc(db, 'users', cred.user.uid), {
        email,
        role,
        createdAt: new Date().toISOString(),
      })
      setUserRole(await fetchUserRole(cred.user.uid))
    } catch (error) {
      console.warn('Signup profile write failed; role remains unverified.', error)
      setUserRole(null)
    }
    setCurrentUser(cred.user)
    return cred
  }

  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    let role = null
    try {
      role = await fetchUserRole(cred.user.uid)
    } catch (error) {
      console.warn('Login role fetch failed; role remains unverified.', error)
    }
    setUserRole(role)
    return { cred, role }
  }

  function logout() {
    setCurrentUser(null)
    setUserRole(null)
    if (auth.currentUser) return signOut(auth)
    return Promise.resolve()
  }

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 4000)

    const unsub = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timer)
      setCurrentUser(user)
      setUserRole(null)
      if (user) {
        try {
          setUserRole(await fetchUserRole(user.uid))
        } catch (e) {
          console.warn('Auth role fetch error:', e)
          setUserRole(null)
        }
      } else {
        setUserRole(null)
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
