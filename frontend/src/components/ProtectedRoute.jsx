import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, userRole, loading } = useAuth()

  if (!currentUser) return <Navigate to="/login" replace />

  if (loading || userRole === null) {
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
