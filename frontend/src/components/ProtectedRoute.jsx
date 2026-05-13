import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, userRole, loading } = useAuth()
  const location = useLocation()
  const [roleLookupExpired, setRoleLookupExpired] = useState(false)

  useEffect(() => {
    setRoleLookupExpired(false)
    if (!currentUser || userRole !== null) return undefined
    const timer = setTimeout(() => setRoleLookupExpired(true), 5000)
    return () => clearTimeout(timer)
  }, [currentUser, userRole])

  if (!currentUser) return <Navigate to="/login" replace />

  if (loading || userRole === null) {
    if (!loading && roleLookupExpired) {
      return (
        <Navigate
          to="/login"
          replace
          state={{
            from: location,
            error: 'Unable to verify your account role. Please sign in again.',
          }}
        />
      )
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span style={{ width: '28px', height: '28px', border: '3px solid #EBEBEB', borderTopColor: '#7353F6', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
      </div>
    )
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to={userRole === 'hr' ? '/hr' : '/candidate'} replace />
  }

  return children
}
