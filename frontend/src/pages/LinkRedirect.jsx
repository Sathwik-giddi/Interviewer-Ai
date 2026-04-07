/**
 * LinkRedirect — Validates a link ID and redirects to the right page.
 * Route: /link/:linkId
 *
 * - Interview links → /interview/{roomId}
 * - Mock links → /mock?token={linkId}
 * - Invalid → shows error
 */
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiUrl } from '../lib/runtimeConfig'

export default function LinkRedirect() {
  const { linkId } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!linkId) {
      setError('No link ID provided.')
      return
    }
    validateAndRedirect()
  }, [linkId])

  async function validateAndRedirect() {
    try {
      const res = await fetch(apiUrl(`/api/link/${encodeURIComponent(linkId)}`))
      if (!res.ok) {
        setError('This link is invalid or has expired.')
        return
      }

      const data = await res.json()
      if (!data.found) {
        setError('This link was not found.')
        return
      }

      const link = data.link

      // Redirect based on type
      if (link.type === 'mock') {
        navigate(`/mock?token=${link.linkId}`, { replace: true })
      } else if (link.roomId) {
        navigate(`/interview/${link.roomId}`, { replace: true })
      } else if (link.fullLink) {
        // Fallback: extract path from the full link
        const url = new URL(link.fullLink)
        navigate(url.pathname, { replace: true })
      } else {
        setError('Link data is incomplete. Please contact HR.')
      }
    } catch (e) {
      console.error('Link redirect error:', e)
      setError('Could not validate this link. Please try again.')
    }
  }

  return (
    <div style={S.page} className="page-enter">
      <div style={S.card}>
        {!error ? (
          <>
            <span className="spinner" style={{ width: '36px', height: '36px' }} />
            <h2 style={S.title}>VALIDATING LINK</h2>
            <p style={S.sub}>Please wait while we set up your session...</p>
          </>
        ) : (
          <>
            <div style={S.errorIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2 style={S.title}>LINK ERROR</h2>
            <p style={S.sub}>{error}</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button className="btn btn-primary" onClick={() => navigate('/')}>Go Home</button>
              <button className="btn btn-ghost" onClick={() => navigate('/login')}>Sign In</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const S = {
  page: {
    minHeight: 'calc(100vh - 60px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#f5f3ff', padding: '32px',
  },
  card: {
    textAlign: 'center', padding: '60px 40px',
    background: '#fff', border: '1px solid var(--border)',
    maxWidth: '480px', width: '100%',
  },
  title: {
    fontFamily: 'var(--font-head)', fontSize: '28px',
    marginTop: '20px', marginBottom: '8px',
  },
  sub: {
    fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6',
  },
  errorIcon: { marginBottom: '4px' },
}
