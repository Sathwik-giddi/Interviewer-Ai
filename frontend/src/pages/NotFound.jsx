import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NotFound() {
  const { currentUser, userRole } = useAuth()
  const home = currentUser ? (userRole === 'hr' ? '/hr' : '/candidate') : '/'

  return (
    <div className="page-enter" style={styles.page}>
      <div style={styles.inner}>
        <p style={styles.code}>404</p>
        <h1 style={styles.title}>PAGE NOT FOUND</h1>
        <p style={styles.sub}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to={home} className="btn btn-primary" style={{ marginTop: '32px' }}>
          ← Back to {currentUser ? 'Dashboard' : 'Home'}
        </Link>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: 'calc(100vh - 60px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-subtle)',
    padding: '40px 16px',
  },
  inner: {
    textAlign: 'center',
  },
  code: {
    fontFamily: 'var(--font-head)',
    fontSize: '120px',
    lineHeight: 1,
    color: 'var(--border)',
    letterSpacing: '0.05em',
  },
  title: {
    fontFamily: 'var(--font-head)',
    fontSize: '36px',
    marginTop: '8px',
  },
  sub: {
    fontSize: '15px',
    color: 'var(--text-muted)',
    marginTop: '12px',
    maxWidth: '360px',
  },
}
