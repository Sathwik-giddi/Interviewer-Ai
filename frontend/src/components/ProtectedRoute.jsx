import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Wraps a route and redirects to /login if not authenticated.
 * If requiredRole is provided, also checks the user's role.
 * When userRole is null (Firestore offline/timeout), renders children anyway
 * to avoid redirect loops.
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, userRole } = useAuth()

  if (!currentUser) return <Navigate to="/login" replace />
  // If role hasn't loaded yet (null), render children rather than redirect-looping
  if (requiredRole && userRole && userRole !== requiredRole) {
    return <Navigate to={userRole === 'hr' ? '/hr' : '/candidate'} replace />
  }
  return children
}
