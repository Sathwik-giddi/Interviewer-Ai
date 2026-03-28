/**
 * LinkList — Displays a table of generated interview/mock links
 *
 * Props:
 *   userId   — current user UID (to fetch their links)
 *   mode     — "hr" | "candidate" (controls which columns show)
 *   refresh  — number, increment to trigger refetch
 */
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from './Toast'

const BACKEND = import.meta.env.VITE_BACKEND_URL || ''

export default function LinkList({ userId, mode = 'hr', refresh = 0 }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    fetchLinks()
  }, [userId, refresh])

  async function fetchLinks() {
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND}/api/links?userId=${encodeURIComponent(userId)}`)
      if (res.ok) {
        const data = await res.json()
        setLinks(data.links || [])
      }
    } catch {
      // Silent fail — links are non-critical
    }
    setLoading(false)
  }

  function copyLink(url) {
    navigator.clipboard.writeText(url)
      .then(() => toast.info('Link copied!'))
      .catch(() => {})
  }

  function formatDate(iso) {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    } catch { return iso }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <span className="spinner" style={{ width: '24px', height: '24px' }} />
      </div>
    )
  }

  if (links.length === 0) {
    return (
      <div style={S.empty}>
        <div style={S.emptyIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" opacity="0.5">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
        </div>
        <p style={S.emptyText}>No links created yet</p>
        <p style={S.emptySub}>
          {mode === 'hr'
            ? 'Create an interview link to invite a candidate.'
            : 'Create a mock link to practice anytime.'}
        </p>
      </div>
    )
  }

  const isHR = mode === 'hr'

  return (
    <div style={S.wrapper}>
      {/* Header row */}
      <div style={{ ...S.row, ...S.headerRow, gridTemplateColumns: isHR ? '2fr 1.5fr 1fr 1.5fr 1fr 140px' : '1fr 2fr 1fr 140px' }}>
        {isHR && <span style={S.headerCell}>Candidate</span>}
        {isHR && <span style={S.headerCell}>Job Title</span>}
        <span style={S.headerCell}>Type</span>
        <span style={S.headerCell}>Created</span>
        <span style={S.headerCell}>Status</span>
        <span style={{ ...S.headerCell, textAlign: 'right' }}>Actions</span>
      </div>

      {/* Data rows */}
      {links.map(link => (
        <div key={link.linkId} style={{ ...S.row, gridTemplateColumns: isHR ? '2fr 1.5fr 1fr 1.5fr 1fr 140px' : '1fr 2fr 1fr 140px' }}>
          {isHR && (
            <span style={S.cell}>
              <span style={{ fontWeight: 600 }}>{link.candidateName || '—'}</span>
              {link.forEmail && (
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {link.forEmail}
                </span>
              )}
            </span>
          )}
          {isHR && (
            <span style={S.cell}>{link.jobTitle || '—'}</span>
          )}
          <span style={S.cell}>
            <span style={{
              ...S.typeBadge,
              background: link.type === 'interview' ? 'var(--primary-light)' : '#fef3c7',
              color: link.type === 'interview' ? 'var(--primary)' : '#92400e',
            }}>
              {link.type === 'interview' ? 'Interview' : 'Mock'}
            </span>
          </span>
          <span style={{ ...S.cell, fontSize: '12px', color: 'var(--text-muted)' }}>
            {formatDate(link.createdAt)}
          </span>
          <span style={S.cell}>
            <span style={{
              ...S.statusDot,
              background: link.used ? '#22c55e' : '#eab308',
            }} />
            <span style={{ fontSize: '12px' }}>{link.used ? 'Used' : 'Pending'}</span>
          </span>
          <span style={{ ...S.cell, justifyContent: 'flex-end', gap: '6px' }}>
            <button style={S.actionBtn} onClick={() => copyLink(link.fullLink)} title="Copy link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy
            </button>
            {isHR && link.roomId && (
              <button
                style={{ ...S.actionBtn, background: 'var(--primary)', color: '#fff' }}
                onClick={() => navigate(`/observe/${link.roomId}`)}
              >
                Watch
              </button>
            )}
          </span>
        </div>
      ))}
    </div>
  )
}

const S = {
  wrapper: {
    border: '1px solid var(--border)', overflow: 'hidden',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1fr 140px',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    fontSize: '13px',
    alignItems: 'center',
  },
  headerRow: {
    background: 'var(--bg-subtle)',
    fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--text-muted)',
  },
  headerCell: {},
  cell: {
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  typeBadge: {
    fontSize: '10px', fontWeight: 700, padding: '3px 10px',
    letterSpacing: '0.04em',
  },
  statusDot: {
    width: '7px', height: '7px', borderRadius: '50%',
    display: 'inline-block', flexShrink: 0,
  },
  actionBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '5px 10px', fontSize: '11px', fontWeight: 600,
    background: 'var(--bg-subtle)', color: 'var(--text-muted)',
    border: '1px solid var(--border)', cursor: 'pointer',
    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
  },
  empty: {
    textAlign: 'center', padding: '48px 20px',
    background: '#fff', border: '1px solid var(--border)',
  },
  emptyIcon: {
    width: '52px', height: '52px', background: 'var(--primary-light)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 12px',
  },
  emptyText: { fontWeight: 700, fontSize: '14px', margin: 0 },
  emptySub: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' },
}
