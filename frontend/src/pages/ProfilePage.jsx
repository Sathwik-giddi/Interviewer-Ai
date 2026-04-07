/**
 * ProfilePage — User profile management (redesigned)
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { updatePassword } from 'firebase/auth'
import { db, auth } from '../firebase'
import { apiUrl } from '../lib/runtimeConfig'

export default function ProfilePage() {
  const { currentUser, userRole } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('personal')

  const [resumeFile, setResumeFile] = useState(null)
  const [parsedResume, setParsedResume] = useState(null)
  const [parsingResume, setParsingResume] = useState(false)

  useEffect(() => { loadProfile() }, [currentUser])

  async function loadProfile() {
    try {
      const snap = await Promise.race([
        getDoc(doc(db, 'users', currentUser.uid)),
        new Promise((_, r) => setTimeout(() => r(), 4000)),
      ])
      if (snap?.exists()) {
        const d = snap.data()
        setName(d.name || '')
        setEmail(d.email || currentUser.email || '')
        setPhone(d.phone || '')
        setCompany(d.company || '')
        if (d.parsedResume) setParsedResume(d.parsedResume)
      } else {
        setEmail(currentUser.email || '')
      }
    } catch {
      setEmail(currentUser.email || '')
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name, phone, company, updatedAt: new Date().toISOString(),
      })

      if (newPassword.length >= 6) {
        await updatePassword(auth.currentUser, newPassword)
        setNewPassword('')
        toast.success('Password updated!')
      }

      toast.success('Profile saved!')
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  async function handleResumeUpload(file) {
    setResumeFile(file)
    if (!file) return
    setParsingResume(true)
    try {
      const fd = new FormData()
      fd.append('resume', file)
      const res = await fetch(apiUrl('/api/parse-resume'), { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        setParsedResume(data)
        try { await updateDoc(doc(db, 'users', currentUser.uid), { parsedResume: data }) } catch {}
        toast.info(`Resume parsed! ${data.skills?.length || 0} skills, ${data.match_score}% match.`)
      }
    } catch {
      toast.error('Resume parsing failed')
    }
    setParsingResume(false)
  }

  const initials = (name || email || 'U').substring(0, 2).toUpperCase()
  const tabs = userRole === 'candidate'
    ? [{ id: 'personal', label: 'Personal Info' }, { id: 'resume', label: 'Resume' }, { id: 'security', label: 'Security' }]
    : [{ id: 'personal', label: 'Personal Info' }, { id: 'security', label: 'Security' }]

  return (
    <div className="page-enter" style={{ minHeight: 'calc(100vh - 60px)', background: '#f5f3ff' }}>
      <div className="container" style={{ padding: '32px 24px', maxWidth: '960px' }}>

        <div style={S.layout}>
          {/* ── Left Sidebar ── */}
          <div style={S.sidebar}>
            {/* Avatar card */}
            <div style={S.avatarCard}>
              <div style={S.avatarCircle}>{initials}</div>
              <h2 style={S.avatarName}>{name || 'Your Name'}</h2>
              <p style={S.avatarEmail}>{email}</p>
              <div style={S.roleBadge}>
                <span style={S.roleIcon}>{userRole === 'hr' ? '🏢' : '👤'}</span>
                <span>{userRole === 'hr' ? 'HR Manager' : 'Candidate'}</span>
              </div>
            </div>

            {/* Navigation */}
            <div style={S.navCard}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    ...S.navItem,
                    ...(activeTab === tab.id ? S.navItemActive : {}),
                  }}
                >
                  <span style={S.navDot(activeTab === tab.id)} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Quick info */}
            <div style={S.infoCard}>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>UID</span>
                <span style={S.infoValue}>{currentUser.uid.substring(0, 10)}…</span>
              </div>
              <div style={{ ...S.infoRow, borderBottom: 'none' }}>
                <span style={S.infoLabel}>Role</span>
                <span style={{ ...S.infoValue, textTransform: 'capitalize' }}>{userRole}</span>
              </div>
            </div>
          </div>

          {/* ── Right Content ── */}
          <div style={S.content}>
            <form onSubmit={handleSave}>

              {/* Personal Info Tab */}
              {activeTab === 'personal' && (
                <div style={S.formCard}>
                  <div style={S.formHeader}>
                    <div>
                      <h3 style={S.formTitle}>Personal Information</h3>
                      <p style={S.formSubtitle}>Update your personal details</p>
                    </div>
                  </div>

                  <div style={S.fieldGrid}>
                    <div style={S.field}>
                      <label style={S.fieldLabel}>
                        <span style={S.fieldIcon}>👤</span>
                        Full Name
                      </label>
                      <input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" style={S.input} />
                    </div>

                    <div style={S.field}>
                      <label style={S.fieldLabel}>
                        <span style={S.fieldIcon}>✉️</span>
                        Email Address
                      </label>
                      <div style={S.disabledInputWrap}>
                        <input value={email} disabled style={S.disabledInput} />
                        <span style={S.lockIcon}>🔒</span>
                      </div>
                      <p style={S.fieldHint}>Email is linked to your auth account and cannot be changed</p>
                    </div>

                    <div style={S.field}>
                      <label style={S.fieldLabel}>
                        <span style={S.fieldIcon}>📞</span>
                        Phone Number
                      </label>
                      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" style={S.input} />
                    </div>

                    {userRole === 'hr' && (
                      <div style={S.field}>
                        <label style={S.fieldLabel}>
                          <span style={S.fieldIcon}>🏢</span>
                          Company
                        </label>
                        <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" style={S.input} />
                      </div>
                    )}
                  </div>

                  <div style={S.formFooter}>
                    <button type="submit" className="btn btn-primary" disabled={saving} style={S.saveBtn}>
                      {saving ? <><span className="spinner" style={{ width: '16px', height: '16px' }} /> Saving…</> : 'Save Changes'}
                    </button>
                    <button type="button" className="btn" style={S.cancelBtn} onClick={() => navigate(userRole === 'hr' ? '/hr' : '/candidate')}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Resume Tab */}
              {activeTab === 'resume' && userRole === 'candidate' && (
                <div style={S.formCard}>
                  <div style={S.formHeader}>
                    <div>
                      <h3 style={S.formTitle}>Resume & Skills</h3>
                      <p style={S.formSubtitle}>Upload your resume for AI-powered skill analysis</p>
                    </div>
                  </div>

                  {/* Upload Area */}
                  <div style={S.uploadArea}>
                    <div style={S.uploadIcon}>📄</div>
                    <p style={S.uploadTitle}>
                      {resumeFile ? resumeFile.name : 'Drop your resume or click to browse'}
                    </p>
                    <p style={S.uploadHint}>PDF or DOCX, max 10MB</p>
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={e => handleResumeUpload(e.target.files[0])}
                      style={S.uploadInput}
                    />
                  </div>

                  {parsingResume && (
                    <div style={S.parsingBar}>
                      <span className="spinner" style={{ width: '16px', height: '16px' }} />
                      <span>Analyzing your resume with AI…</span>
                    </div>
                  )}

                  {/* Resume Analysis Results */}
                  {parsedResume && (
                    <div style={S.resumeResults}>
                      {/* Score Header */}
                      <div style={S.resumeScoreHeader}>
                        <div style={S.resumeScoreCircle(parsedResume.match_score)}>
                          <span style={S.resumeScoreNum}>{parsedResume.match_score}</span>
                          <span style={S.resumeScoreLabel}>match</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={S.resumeScoreTitle}>Resume Analysis Complete</p>
                          {parsedResume.years_experience > 0 && (
                            <p style={S.resumeMeta}>{parsedResume.years_experience} years of experience detected</p>
                          )}
                          <p style={S.resumeMeta}>
                            {parsedResume.skills?.length || 0} skills identified ·&nbsp;
                            {parsedResume.matched_skills?.length || 0} matched
                          </p>
                          <div style={S.scoreBar}>
                            <div style={{
                              ...S.scoreBarFill,
                              width: `${parsedResume.match_score}%`,
                              background: parsedResume.match_score >= 70 ? '#22c55e' : parsedResume.match_score >= 40 ? '#eab308' : '#dc2626',
                            }} />
                          </div>
                        </div>
                      </div>

                      {/* Skills */}
                      <div style={S.skillsSection}>
                        <p style={S.skillsSectionTitle}>Detected Skills</p>
                        <div style={S.skillsWrap}>
                          {(parsedResume.skills || []).slice(0, 15).map((s, i) => {
                            const isMatched = parsedResume.matched_skills?.includes(s)
                            return (
                              <span key={i} style={{
                                ...S.skillTag,
                                background: isMatched ? 'var(--primary)' : '#f1f5f9',
                                color: isMatched ? '#fff' : 'var(--text-muted)',
                                fontWeight: isMatched ? 700 : 500,
                              }}>
                                {isMatched && '✓ '}{s}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div style={S.formCard}>
                  <div style={S.formHeader}>
                    <div>
                      <h3 style={S.formTitle}>Security</h3>
                      <p style={S.formSubtitle}>Manage your password and account security</p>
                    </div>
                  </div>

                  <div style={S.securityCard}>
                    <div style={S.securityIcon}>🔐</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Change Password</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Enter a new password (minimum 6 characters). Leave blank to keep your current password.
                      </p>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="New password"
                          minLength={6}
                          style={S.input}
                        />
                      </div>
                      {newPassword.length > 0 && newPassword.length < 6 && (
                        <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '6px' }}>
                          Password must be at least 6 characters
                        </p>
                      )}
                      {newPassword.length >= 6 && (
                        <p style={{ fontSize: '12px', color: '#22c55e', marginTop: '6px' }}>
                          Password is valid — click Save to update
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={S.formFooter}>
                    <button type="submit" className="btn btn-primary" disabled={saving || (newPassword.length > 0 && newPassword.length < 6)} style={S.saveBtn}>
                      {saving ? 'Saving…' : 'Update Password'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

const S = {
  layout: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', alignItems: 'flex-start' },

  // Sidebar
  sidebar: { display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '92px' },
  avatarCard: {
    background: 'linear-gradient(135deg, #7353F6 0%, #5a3ed4 50%, #4c1d95 100%)',
    padding: '32px 24px', textAlign: 'center',
  },
  avatarCircle: {
    width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
    fontSize: '28px', fontFamily: 'var(--font-head)', color: '#fff', border: '3px solid rgba(255,255,255,0.3)',
  },
  avatarName: { fontFamily: 'var(--font-head)', fontSize: '22px', color: '#fff', marginBottom: '4px' },
  avatarEmail: { fontSize: '12px', color: 'rgba(255,255,255,0.7)' },
  roleBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px',
    padding: '4px 14px', background: 'rgba(255,255,255,0.15)', fontSize: '12px',
    color: '#fff', fontWeight: 600, borderRadius: '0px',
  },
  roleIcon: { fontSize: '14px' },

  navCard: {
    background: '#fff', border: '1px solid var(--border)', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },
  navItem: {
    padding: '14px 20px', fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)',
    background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
    cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)',
    display: 'flex', alignItems: 'center', gap: '10px',
    transition: 'all 0.15s ease',
  },
  navItemActive: {
    color: 'var(--primary)', fontWeight: 700, background: 'var(--primary-light)',
    borderLeft: '3px solid var(--primary)',
  },
  navDot: (active) => ({
    width: '6px', height: '6px', borderRadius: '50%',
    background: active ? 'var(--primary)' : 'var(--border)',
    flexShrink: 0,
  }),

  infoCard: { background: '#fff', border: '1px solid var(--border)' },
  infoRow: {
    padding: '14px 20px', display: 'flex', justifyContent: 'space-between',
    borderBottom: '1px solid var(--border)', fontSize: '13px',
  },
  infoLabel: { color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' },
  infoValue: { fontWeight: 500, fontFamily: 'monospace', fontSize: '12px' },

  // Content
  content: { minWidth: 0 },
  formCard: { background: '#fff', border: '1px solid var(--border)', overflow: 'hidden' },
  formHeader: {
    padding: '28px 32px', borderBottom: '1px solid var(--border)',
    background: 'var(--bg-subtle)',
  },
  formTitle: { fontFamily: 'var(--font-head)', fontSize: '22px', marginBottom: '4px' },
  formSubtitle: { fontSize: '13px', color: 'var(--text-muted)' },

  fieldGrid: { padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '24px' },
  field: {},
  fieldLabel: {
    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600,
    color: 'var(--text)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  fieldIcon: { fontSize: '16px' },
  input: {
    width: '100%', padding: '12px 16px', fontSize: '14px', fontFamily: 'var(--font-body)',
    border: '2px solid var(--border)', background: '#fff', color: 'var(--text)',
    outline: 'none', transition: 'border-color 0.2s ease',
  },
  disabledInputWrap: { position: 'relative' },
  disabledInput: {
    width: '100%', padding: '12px 16px', paddingRight: '40px', fontSize: '14px',
    fontFamily: 'var(--font-body)', border: '2px solid var(--border)',
    background: 'var(--bg-subtle)', color: 'var(--text-muted)', cursor: 'not-allowed',
  },
  lockIcon: { position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px' },
  fieldHint: { fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' },

  formFooter: {
    padding: '20px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg-subtle)',
    display: 'flex', gap: '12px',
  },
  saveBtn: { padding: '12px 32px', fontWeight: 700, fontSize: '14px' },
  cancelBtn: {
    padding: '12px 24px', fontWeight: 600, fontSize: '14px', color: 'var(--text-muted)',
    background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  },

  // Upload
  uploadArea: {
    margin: '28px 32px', padding: '40px 20px', textAlign: 'center',
    border: '2px dashed var(--border)', background: 'var(--bg-subtle)',
    position: 'relative', cursor: 'pointer',
    transition: 'border-color 0.2s ease, background 0.2s ease',
  },
  uploadIcon: { fontSize: '40px', marginBottom: '12px' },
  uploadTitle: { fontSize: '14px', fontWeight: 600, marginBottom: '4px' },
  uploadHint: { fontSize: '12px', color: 'var(--text-muted)' },
  uploadInput: {
    position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%',
  },

  parsingBar: {
    margin: '0 32px 20px', padding: '12px 16px', background: 'var(--primary-light)',
    display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--primary)', fontWeight: 600,
  },

  // Resume results
  resumeResults: { margin: '0 32px 28px' },
  resumeScoreHeader: {
    display: 'flex', alignItems: 'center', gap: '20px', padding: '20px',
    background: 'var(--bg-subtle)', border: '1px solid var(--border)', marginBottom: '16px',
  },
  resumeScoreCircle: (score) => ({
    width: '80px', height: '80px', borderRadius: '50%',
    border: `4px solid ${score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#dc2626'}`,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  }),
  resumeScoreNum: { fontFamily: 'var(--font-head)', fontSize: '28px', lineHeight: 1 },
  resumeScoreLabel: { fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' },
  resumeScoreTitle: { fontWeight: 700, fontSize: '15px', marginBottom: '4px' },
  resumeMeta: { fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' },
  scoreBar: { height: '6px', background: 'var(--border)', width: '100%', marginTop: '10px' },
  scoreBarFill: { height: '100%', transition: 'width 0.6s ease' },

  skillsSection: { padding: '16px 20px', border: '1px solid var(--border)' },
  skillsSectionTitle: {
    fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--text-muted)', marginBottom: '12px',
  },
  skillsWrap: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  skillTag: { padding: '5px 12px', fontSize: '12px' },

  // Security
  securityCard: {
    margin: '28px 32px', padding: '24px', border: '1px solid var(--border)',
    display: 'flex', gap: '20px', alignItems: 'flex-start',
  },
  securityIcon: { fontSize: '32px', flexShrink: 0 },
}
