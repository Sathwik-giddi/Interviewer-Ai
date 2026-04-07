/**
 * LinkModal — Modal form for creating interview / mock links
 *
 * Props:
 *   isOpen        — boolean
 *   onClose       — function
 *   mode          — "hr" | "candidate"
 *   userId        — current user UID
 *   userEmail     — current user email (for candidate self-send)
 *   campaigns     — array of campaign objects (for HR to pick from)
 *   onLinkCreated — callback({ link, linkId, emailSent }) when done
 */
import React, { useState } from 'react'
import Modal from './Modal'
import { useToast } from './Toast'
import { apiUrl, getPublicAppOrigin } from '../lib/runtimeConfig'

export default function LinkModal({
  isOpen,
  onClose,
  mode = 'candidate',
  userId = '',
  userEmail = '',
  campaigns = [],
  onLinkCreated,
}) {
  const toast = useToast()

  // ── Form state ──
  const [email, setEmail] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { link, emailSent }

  function resetForm() {
    setEmail('')
    setCandidateName('')
    setJobTitle('')
    setCampaignId('')
    setNote('')
    setResult(null)
  }

  function handleClose() {
    resetForm()
    onClose?.()
  }

  async function handleSubmit(e) {
    e.preventDefault()

    // Validate
    if (mode === 'hr' && !email.trim()) {
      toast.error('Please enter the candidate\'s email.')
      return
    }

    setLoading(true)
    try {
      const body = {
        type: mode === 'hr' ? 'interview' : 'mock',
        role: mode,
        userId,
        email: mode === 'hr' ? email.trim() : userEmail,
        candidateName: candidateName.trim(),
        jobTitle: jobTitle.trim(),
        campaignId: campaignId || undefined,
        note: note.trim(),
        frontendUrl: getPublicAppOrigin(),
      }

      const res = await fetch(apiUrl('/api/generate-link'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to generate link')
      }

      const data = await res.json()
      setResult(data)
      onLinkCreated?.(data)

      if (data.emailSent) {
        if (data.emailForwardRequired && data.emailDeliveredTo) {
          toast.success(`Email sent to ${data.emailDeliveredTo}. Forward it to ${mode === 'hr' ? email : userEmail}.`)
        } else {
          toast.success(`Email sent to ${data.emailDeliveredTo || (mode === 'hr' ? email : userEmail)}!`)
        }
      } else if (data.emailError) {
        toast.warning(`Link created but email failed: ${data.emailError}`)
      } else {
        toast.success('Link generated! Copy it below.')
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function copyLink() {
    if (result?.link) {
      navigator.clipboard.writeText(result.link)
        .then(() => toast.info('Link copied to clipboard!'))
        .catch(() => {})
    }
  }

  const isHR = mode === 'hr'
  const title = isHR ? 'CREATE INTERVIEW LINK' : 'CREATE MOCK INTERVIEW LINK'

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="md">
      {!result ? (
        /* ── FORM ── */
        <form onSubmit={handleSubmit}>
          {isHR && (
            <>
              <div className="form-group">
                <label style={S.label}>CANDIDATE EMAIL *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  required
                  style={S.input}
                />
              </div>
              <div className="form-group">
                <label style={S.label}>CANDIDATE NAME</label>
                <input
                  value={candidateName}
                  onChange={e => setCandidateName(e.target.value)}
                  placeholder="John Doe"
                  style={S.input}
                />
              </div>
              <div className="form-group">
                <label style={S.label}>JOB TITLE / ROLE</label>
                <input
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  style={S.input}
                />
              </div>
              {campaigns.length > 0 && (
                <div className="form-group">
                  <label style={S.label}>LINK TO CAMPAIGN (OPTIONAL)</label>
                  <select
                    value={campaignId}
                    onChange={e => setCampaignId(e.target.value)}
                    style={S.input}
                  >
                    <option value="">— No campaign —</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label style={S.label}>NOTE FOR CANDIDATE (OPTIONAL)</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Any special instructions..."
                  style={{ ...S.input, minHeight: '60px', resize: 'vertical' }}
                />
              </div>
            </>
          )}

          {!isHR && (
            <div style={S.mockConfirm}>
              <div style={S.mockIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: '1.6', margin: 0 }}>
                This will create a unique mock interview link and send it to
                <strong> {userEmail}</strong>. You can use it to practice anytime.
              </p>
            </div>
          )}

          <div style={S.actions}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleClose}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ flex: 2, justifyContent: 'center' }}
            >
              {loading ? (
                <><span className="spinner" style={{ width: '16px', height: '16px' }} /> Generating...</>
              ) : (
                isHR ? 'Generate & Send Link' : 'Create Mock Link'
              )}
            </button>
          </div>
        </form>
      ) : (
        /* ── SUCCESS RESULT ── */
        <div style={S.successBox}>
          <div style={S.successIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3 style={S.successTitle}>Link Created!</h3>

          {result.emailSent ? (
            <p style={S.successSub}>
              Email sent to <strong>{result.emailDeliveredTo || (isHR ? email : userEmail)}</strong>
              <span style={S.emailBadge}>via Resend</span>
              {result.emailForwardRequired ? (
                <>
                  <br />
                  <span style={{ fontSize: '12px' }}>
                    Forward it to <strong>{result.emailRequestedFor || (isHR ? email : userEmail)}</strong>.
                  </span>
                </>
              ) : null}
            </p>
          ) : result.emailError ? (
            <p style={{ ...S.successSub, color: 'var(--danger)' }}>
              Email to <strong>{isHR ? email : userEmail}</strong> failed: {result.emailError}
              <br /><span style={{ fontSize: '12px' }}>You can still copy the link below and share it manually.</span>
            </p>
          ) : null}

          <div style={S.linkBox}>
            <code style={S.linkText}>{result.link}</code>
            <button style={S.copyBtn} onClick={copyLink}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy
            </button>
          </div>

          <div style={S.actions}>
            <button
              className="btn btn-ghost"
              onClick={handleClose}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              Close
            </button>
            <button
              className="btn btn-primary"
              onClick={() => { resetForm() }}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              Create Another
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

const S = {
  label: {
    fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)',
    letterSpacing: '0.08em', marginBottom: '6px', display: 'block',
  },
  input: {
    width: '100%', padding: '12px 14px', fontSize: '14px',
    border: '1.5px solid var(--border)', background: 'var(--bg-subtle)',
    fontFamily: 'var(--font-body)', outline: 'none',
  },
  mockConfirm: {
    display: 'flex', gap: '16px', alignItems: 'center',
    padding: '20px', border: '1px solid var(--border)',
    background: 'var(--bg-subtle)', marginBottom: '20px',
  },
  mockIcon: { flexShrink: 0 },
  actions: {
    display: 'flex', gap: '12px', marginTop: '20px',
  },
  successBox: { textAlign: 'center' },
  successIcon: { marginBottom: '16px' },
  successTitle: {
    fontFamily: 'var(--font-head)', fontSize: '24px',
    marginBottom: '8px', color: '#22c55e',
  },
  successSub: { fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' },
  emailBadge: {
    display: 'inline-block', fontSize: '10px', fontWeight: 700,
    padding: '2px 8px', background: 'var(--primary-light)',
    color: 'var(--primary)', marginLeft: '8px', textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  linkBox: {
    display: 'flex', gap: '8px', alignItems: 'center',
    padding: '12px 14px', border: '1px solid var(--border)',
    background: 'var(--bg-subtle)', marginBottom: '20px',
  },
  linkText: {
    flex: 1, fontSize: '12px', color: 'var(--text)',
    fontFamily: 'monospace', wordBreak: 'break-all',
  },
  copyBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '6px 14px', fontSize: '12px', fontWeight: 600,
    background: 'var(--primary)', color: '#fff', border: 'none',
    cursor: 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0,
  },
}
