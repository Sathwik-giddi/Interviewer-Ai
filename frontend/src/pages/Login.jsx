import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { role } = await login(email, password)
      navigate(role === 'hr' ? '/hr' : '/candidate', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.page} className="page-enter app-page auth-page">
      <div style={S.wrapper} className="auth-layout">
        {/* Left decorative panel */}
        <div style={S.leftPanel} className="auth-aside">
          <div style={S.leftContent}>
            <div style={S.logoMark}>AI</div>
            <h2 style={S.leftTitle}>WELCOME<br />BACK</h2>
            <p style={S.leftSub}>Sign in to continue your AI-powered interview experience.</p>
            <div style={S.dots}>
              <span style={{ ...S.dot, background: '#fff' }} />
              <span style={{ ...S.dot, background: 'rgba(255,255,255,0.4)' }} />
              <span style={{ ...S.dot, background: 'rgba(255,255,255,0.4)' }} />
            </div>
          </div>
          <div style={S.leftPattern} />
        </div>

        {/* Right form panel */}
        <div style={S.rightPanel} className="auth-main">
          <div style={S.formWrap}>
            <h1 style={S.title}>SIGN IN</h1>
            <p style={S.sub}>Enter your credentials to access your account.</p>

            {error && <div style={S.errorBox}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ marginTop: '28px' }}>
              <div style={S.fieldGroup}>
                <label style={S.label}>EMAIL</label>
                <div style={S.inputWrap}>
                  <span style={S.inputIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b0aec0" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    style={S.input}
                  />
                </div>
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>PASSWORD</label>
                <div style={S.inputWrap}>
                  <span style={S.inputIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b0aec0" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    style={S.input}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={S.submitBtn}
              >
                {loading ? <span className="spinner" style={{ width: '18px', height: '18px' }} /> : 'Sign In'}
              </button>
            </form>

            <div style={S.dividerRow}>
              <span style={S.dividerLine} />
              <span style={S.dividerText}>OR</span>
              <span style={S.dividerLine} />
            </div>

            <p style={S.footerText}>
              Don't have an account?{' '}
              <Link to="/signup" style={S.link}>Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function getErrorMessage(code) {
  switch (code) {
    case 'auth/user-not-found': return 'No account found with this email.'
    case 'auth/wrong-password': return 'Incorrect password.'
    case 'auth/invalid-credential': return 'Invalid email or password.'
    case 'auth/too-many-requests': return 'Too many attempts. Try again later.'
    default: return 'Failed to sign in. Please try again.'
  }
}

const S = {
  page: {
    minHeight: 'calc(100vh - 60px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px',
    background: '#f5f3ff',
  },
  wrapper: {
    display: 'grid',
    gridTemplateColumns: '380px 1fr',
    width: '100%',
    maxWidth: '820px',
    minHeight: '520px',
    background: '#fff',
    border: '1px solid var(--border)',
    overflow: 'hidden',
  },
  leftPanel: {
    background: 'linear-gradient(160deg, #7353F6 0%, #5a3ed4 60%, #4429b0 100%)',
    padding: '48px 36px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  leftContent: {
    position: 'relative',
    zIndex: 2,
  },
  leftPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 50%)',
    zIndex: 1,
  },
  logoMark: {
    width: '48px',
    height: '48px',
    background: 'rgba(255,255,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-head)',
    fontSize: '22px',
    color: '#fff',
    letterSpacing: '0.05em',
    marginBottom: '32px',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  leftTitle: {
    fontFamily: 'var(--font-head)',
    fontSize: '42px',
    color: '#fff',
    lineHeight: '1.0',
    marginBottom: '16px',
    letterSpacing: '0.04em',
  },
  leftSub: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: '1.7',
    maxWidth: '260px',
  },
  dots: {
    display: 'flex',
    gap: '8px',
    marginTop: '36px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  rightPanel: {
    padding: '48px 44px',
    display: 'flex',
    alignItems: 'center',
  },
  formWrap: {
    width: '100%',
  },
  title: {
    fontFamily: 'var(--font-head)',
    fontSize: '36px',
    marginBottom: '8px',
    color: 'var(--text)',
  },
  sub: {
    fontSize: '14px',
    color: 'var(--text-muted)',
  },
  errorBox: {
    marginTop: '20px',
    padding: '12px 16px',
    background: '#fff5f5',
    border: '1px solid var(--danger)',
    color: 'var(--danger)',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  fieldGroup: {
    marginBottom: '20px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
    marginBottom: '6px',
    display: 'block',
  },
  inputWrap: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '12px 14px 12px 44px',
    fontSize: '14px',
    border: '1.5px solid var(--border)',
    background: 'var(--bg)',
    fontFamily: 'var(--font-body)',
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  submitBtn: {
    width: '100%',
    justifyContent: 'center',
    padding: '14px',
    fontSize: '15px',
    marginTop: '4px',
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    margin: '28px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'var(--border)',
  },
  dividerText: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
  },
  footerText: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  link: {
    color: 'var(--primary)',
    fontWeight: 600,
    textDecoration: 'none',
  },
}
