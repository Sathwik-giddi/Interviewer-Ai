import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState(params.get('role') || 'candidate')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) return setError('Passwords do not match.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true)
    try {
      await signup(email, password, role)
      navigate(role === 'hr' ? '/hr' : '/candidate')
    } catch (err) {
      setError(getErrorMessage(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.page} className="page-enter">
      <div style={S.wrapper}>
        {/* Left decorative panel */}
        <div style={S.leftPanel}>
          <div style={S.leftContent}>
            <div style={S.logoMark}>AI</div>
            <h2 style={S.leftTitle}>JOIN<br />THE FUTURE</h2>
            <p style={S.leftSub}>Create your account and experience AI-powered interviews in seconds.</p>
            <div style={S.featureList}>
              <div style={S.featureItem}>
                <span style={S.checkIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                </span>
                <span>AI-generated questions</span>
              </div>
              <div style={S.featureItem}>
                <span style={S.checkIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                </span>
                <span>Real-time proctoring</span>
              </div>
              <div style={S.featureItem}>
                <span style={S.checkIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                </span>
                <span>Instant evaluation reports</span>
              </div>
            </div>
          </div>
          <div style={S.leftPattern} />
        </div>

        {/* Right form panel */}
        <div style={S.rightPanel}>
          <div style={S.formWrap}>
            <h1 style={S.title}>CREATE ACCOUNT</h1>
            <p style={S.sub}>Choose your role and get started.</p>

            {error && <div style={S.errorBox}>{error}</div>}

            {/* Role selector */}
            <div style={S.roleRow}>
              <button
                type="button"
                onClick={() => setRole('candidate')}
                style={{ ...S.roleBtn, ...(role === 'candidate' ? S.roleBtnActive : {}) }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>Candidate</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('hr')}
                style={{ ...S.roleBtn, ...(role === 'hr' ? S.roleBtnActive : {}) }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                <span>HR / Recruiter</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
              <div style={S.fieldGroup}>
                <label style={S.label}>EMAIL</label>
                <div style={S.inputWrap}>
                  <span style={S.inputIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b0aec0" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg>
                  </span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required style={S.input} />
                </div>
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>PASSWORD</label>
                <div style={S.inputWrap}>
                  <span style={S.inputIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b0aec0" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  </span>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" required style={S.input} />
                </div>
                {password && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: password.length >= 6 ? 'var(--success)' : 'var(--danger)' }}>
                    {password.length >= 6 ? 'Strong enough' : `${6 - password.length} more characters needed`}
                  </div>
                )}
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>CONFIRM PASSWORD</label>
                <div style={S.inputWrap}>
                  <span style={S.inputIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b0aec0" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  </span>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required style={S.input} />
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={S.submitBtn}
              >
                {loading ? <span className="spinner" style={{ width: '18px', height: '18px' }} /> : 'Create Account'}
              </button>
            </form>

            <div style={S.dividerRow}>
              <span style={S.dividerLine} />
              <span style={S.dividerText}>OR</span>
              <span style={S.dividerLine} />
            </div>

            <p style={S.footerText}>
              Already have an account?{' '}
              <Link to="/login" style={S.link}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function getErrorMessage(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'An account with this email already exists.'
    case 'auth/invalid-email': return 'Invalid email address.'
    case 'auth/weak-password': return 'Password is too weak.'
    default: return 'Failed to create account. Please try again.'
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
    gridTemplateColumns: '360px 1fr',
    width: '100%',
    maxWidth: '860px',
    minHeight: '600px',
    background: '#fff',
    border: '1px solid var(--border)',
    overflow: 'hidden',
  },
  leftPanel: {
    background: 'linear-gradient(160deg, #7353F6 0%, #5a3ed4 60%, #4429b0 100%)',
    padding: '44px 32px',
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
    width: '44px',
    height: '44px',
    background: 'rgba(255,255,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-head)',
    fontSize: '20px',
    color: '#fff',
    letterSpacing: '0.05em',
    marginBottom: '28px',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  leftTitle: {
    fontFamily: 'var(--font-head)',
    fontSize: '38px',
    color: '#fff',
    lineHeight: '1.0',
    marginBottom: '14px',
    letterSpacing: '0.04em',
  },
  leftSub: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: '1.7',
    maxWidth: '260px',
  },
  featureList: {
    marginTop: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.85)',
  },
  checkIcon: {
    width: '22px',
    height: '22px',
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rightPanel: {
    padding: '40px 44px',
    display: 'flex',
    alignItems: 'center',
    overflowY: 'auto',
  },
  formWrap: {
    width: '100%',
  },
  title: {
    fontFamily: 'var(--font-head)',
    fontSize: '34px',
    marginBottom: '6px',
    color: 'var(--text)',
  },
  sub: {
    fontSize: '14px',
    color: 'var(--text-muted)',
  },
  errorBox: {
    marginTop: '16px',
    padding: '12px 16px',
    background: '#fff5f5',
    border: '1px solid var(--danger)',
    color: 'var(--danger)',
    fontSize: '13px',
  },
  roleRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginTop: '24px',
  },
  roleBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 12px',
    background: 'var(--bg)',
    border: '2px solid var(--border)',
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    color: 'var(--text-muted)',
    transition: 'all 0.2s ease',
  },
  roleBtnActive: {
    background: 'var(--primary-light)',
    borderColor: 'var(--primary)',
    color: 'var(--primary)',
  },
  fieldGroup: {
    marginBottom: '18px',
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
    margin: '24px 0',
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
