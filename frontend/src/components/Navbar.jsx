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

const publicSections = [
  { id: 'why-canvue', label: 'Why Canvue' },
  { id: 'workflow', label: 'How It Works' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
]

export default function Navbar() {
  const { currentUser, userRole, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const isPublicLanding = !currentUser && location.pathname === '/'

  async function handleLogout() {
    await logout()
    setMenuOpen(false)
    navigate('/')
  }

  function handlePublicScroll(sectionId) {
    const section = document.getElementById(sectionId)
    if (section) {
      section.scrollIntoView({ block: 'start' })
    }
    setMenuOpen(false)
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
    <nav
      style={{
        ...styles.nav,
        ...(isPublicLanding ? styles.navLanding : {}),
      }}
      className="site-nav"
    >
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
          {isPublicLanding && publicSections.map(section => (
            <button
              key={section.id}
              type="button"
              onClick={() => handlePublicScroll(section.id)}
              style={styles.publicLink}
            >
              {section.label}
            </button>
          ))}
          {!currentUser && (
            <>
              <Link
                to="/login"
                className="btn btn-ghost"
                style={{
                  ...styles.navBtn,
                  ...(isPublicLanding ? styles.navBtnLandingSecondary : {}),
                }}
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="btn btn-primary"
                style={{
                  ...styles.navBtn,
                  ...(isPublicLanding ? styles.navBtnLandingPrimary : {}),
                }}
              >
                Start Free Trial
              </Link>
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
  navLanding: {
    background: 'rgba(248, 251, 255, 0.72)',
    backdropFilter: 'blur(22px)',
    borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
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
    background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '11px',
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)',
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
  navBtnLandingPrimary: {
    padding: '10px 18px',
    borderRadius: '999px',
    boxShadow: '0 18px 36px rgba(15, 23, 42, 0.14)',
  },
  navBtnLandingSecondary: {
    padding: '10px 18px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.68)',
    borderColor: 'rgba(15, 23, 42, 0.1)',
  },
  publicLink: {
    padding: '9px 12px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: '999px',
    transition: 'background 0.2s, color 0.2s, transform 0.2s',
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
