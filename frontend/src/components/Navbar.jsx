import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const hrLinks = [
  { to: '/hr', label: 'Dashboard', exact: true },
  { to: '/hr/candidates', label: 'Candidates' },
  { to: '/hr/analytics', label: 'Analytics' },
  { to: '/hr/reports', label: 'Reports' },
]

const candidateLinks = [
  { to: '/candidate', label: 'My Interviews', exact: true },
  { to: '/mock', label: 'Practice' },
  { to: '/candidate/ats-report', label: 'ATS Score' },
]

export default function Navbar() {
  const { currentUser, userRole, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const roleLinks = userRole === 'hr' ? hrLinks : userRole === 'candidate' ? candidateLinks : []

  function isActive(link) {
    if (link.exact) return location.pathname === link.to
    return location.pathname.startsWith(link.to)
  }

  return (
    <nav style={styles.nav}>
      <div className="container" style={styles.inner}>
        <Link to={currentUser ? (userRole === 'hr' ? '/hr' : '/candidate') : '/'} style={styles.logo}>
          <span style={styles.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </span>
          AI<span style={{ color: 'var(--primary)' }}>INTERVIEWER</span>
        </Link>
        <div style={styles.links}>
          {!currentUser && (
            <>
              <Link to="/login" className="btn btn-ghost" style={styles.navBtn}>Login</Link>
              <Link to="/signup" className="btn btn-primary" style={styles.navBtn}>Sign Up</Link>
            </>
          )}
          {currentUser && roleLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                ...styles.navLink,
                ...(isActive(link) ? styles.navLinkActive : {}),
              }}
            >
              {link.label}
            </Link>
          ))}
          {currentUser && (
            <Link
              to="/profile"
              style={{
                ...styles.navLink,
                ...(location.pathname === '/profile' ? styles.navLinkActive : {}),
              }}
            >
              Profile
            </Link>
          )}
          {currentUser && (
            <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '7px 14px', fontSize: '13px', marginLeft: '4px' }}>
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    borderBottom: '1px solid var(--border)',
    background: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(12px)',
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '60px',
  },
  logo: {
    fontFamily: 'var(--font-head)',
    fontSize: '22px',
    letterSpacing: '0.08em',
    color: 'var(--text)',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    background: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  navLink: {
    padding: '7px 14px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textDecoration: 'none',
    transition: 'color 0.2s',
    fontFamily: 'var(--font-body)',
    borderBottom: '2px solid transparent',
  },
  navLinkActive: {
    color: 'var(--primary)',
    borderBottomColor: 'var(--primary)',
  },
  navBtn: {
    padding: '8px 16px',
    fontSize: '13px',
  },
}
