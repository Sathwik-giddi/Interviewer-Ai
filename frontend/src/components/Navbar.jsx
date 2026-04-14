import React, { useEffect, useState } from 'react'
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
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    await logout()
    setMenuOpen(false)
    navigate('/')
  }

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const roleLinks = userRole === 'hr' ? hrLinks : userRole === 'candidate' ? candidateLinks : []

  function isActive(link) {
    if (link.exact) return location.pathname === link.to
    return location.pathname.startsWith(link.to)
  }

  return (
    <nav style={styles.nav} className="site-nav">
      <div className="container site-nav__inner" style={styles.inner}>
        <Link to={currentUser ? (userRole === 'hr' ? '/hr' : '/candidate') : '/'} style={styles.logo}>
          <span style={styles.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </span>
          CAN<span style={{ color: 'var(--primary)' }}>VUE</span>
        </Link>
        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          className="site-nav__toggle"
          style={styles.toggle}
          onClick={() => setMenuOpen(open => !open)}
        >
          <span style={styles.toggleBar} />
          <span style={styles.toggleBar} />
          <span style={styles.toggleBar} />
        </button>
        <div style={styles.links} className={`site-nav__links${menuOpen ? ' is-open' : ''}`}>
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
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '60px',
    gap: '12px',
    position: 'relative',
    paddingBlock: '8px',
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
    background: 'var(--gradient-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
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
  toggle: {
    display: 'none',
    width: '44px',
    height: '44px',
    background: 'transparent',
    border: '1px solid var(--border)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '4px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  toggleBar: {
    width: '18px',
    height: '2px',
    background: 'var(--text)',
    display: 'block',
  },
}
