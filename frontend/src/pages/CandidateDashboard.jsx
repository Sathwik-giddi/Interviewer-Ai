import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LinkModal from '../components/LinkModal'
import LinkList from '../components/LinkList'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function CandidateDashboard() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [campaignId, setCampaignId] = useState('')
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkRefresh, setLinkRefresh] = useState(0)

  useEffect(() => {
    loadSessions()
  }, [currentUser])

  async function loadSessions() {
    setLoading(true)
    try {
      const q = query(
        collection(db, 'sessions'),
        where('candidateId', '==', currentUser.uid)
      )
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      const snap = await Promise.race([getDocs(q), timeout])
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      data.sort((a, b) => {
        const da = a.startedAt?.toDate ? a.startedAt.toDate() : new Date(a.startedAt || 0)
        const db = b.startedAt?.toDate ? b.startedAt.toDate() : new Date(b.startedAt || 0)
        return db - da
      })
      setSessions(data)
    } catch (e) {
      console.warn('Load sessions error:', e)
    } finally {
      setLoading(false)
    }
  }

  function handleJoin(e) {
    e.preventDefault()
    const id = campaignId.trim()
    if (!id) return
    const match = id.match(/interview\/([^/?#]+)/)
    navigate(`/interview/${match ? match[1] : id}`)
  }

  const completed = sessions.filter(s => s.status === 'completed')
  const avgScore = completed.length > 0
    ? Math.round(completed.filter(s => s.overallScore).reduce((a, s) => a + (s.overallScore || 0), 0) / Math.max(completed.filter(s => s.overallScore).length, 1))
    : null
  const inProgress = sessions.filter(s => s.status === 'in-progress').length
  const firstName = currentUser.displayName?.split(' ')[0] || currentUser.email?.split('@')[0] || 'there'

  return (
    <div className="page-enter" style={{ minHeight: 'calc(100vh - 60px)', background: '#f5f3ff' }}>
      <div className="container" style={{ padding: '32px 24px', maxWidth: '1100px' }}>

        {/* ── Hero Banner ── */}
        <div style={S.heroBanner}>
          <div style={S.heroContent}>
            <div style={S.heroAvatar}>
              {firstName[0].toUpperCase()}
            </div>
            <div>
              <h1 style={S.heroTitle}>Welcome back, {firstName}</h1>
              <p style={S.heroSub}>{currentUser.email}</p>
            </div>
          </div>
          <div style={S.heroActions}>
            <Link to="/mock" className="btn" style={S.heroBtn}>Start Practice</Link>
            <button className="btn" style={S.heroBtnOutline} onClick={() => setShowLinkModal(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}><rect x="2" y="4" width="20" height="16" rx="0"/><path d="M22 4L12 13 2 4"/></svg>
              Email Mock Link
            </button>
            <Link to="/candidate/ats-report" className="btn" style={S.heroBtnOutline}>Check ATS Score</Link>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div style={S.statsRow}>
          {[
            { label: 'Total Interviews', value: sessions.length, color: 'var(--primary)', icon: '📋' },
            { label: 'Completed', value: completed.length, color: '#22c55e', icon: '✅' },
            { label: 'Avg Score', value: avgScore !== null ? avgScore : '—', color: '#7353F6', icon: '📊' },
            { label: 'In Progress', value: inProgress, color: '#eab308', icon: '⏳' },
          ].map((stat, i) => (
            <div key={i} style={S.statCard}>
              <div style={S.statIcon}>{stat.icon}</div>
              <div>
                <p style={{ ...S.statValue, color: stat.color }}>{stat.value}</p>
                <p style={S.statLabel}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Quick Actions Grid ── */}
        <h2 style={S.sectionTitle}>Quick Actions</h2>

        {/* Join Interview — featured card */}
        <div style={S.actionsOuter}>
          <div style={S.actionCardFeatured}>
            <div style={S.actionCardHeader}>
              <div style={S.actionIconCircle}>
                <span style={{ fontSize: '22px' }}>🚀</span>
              </div>
              <div>
                <h3 style={S.actionTitle}>Join Interview</h3>
                <p style={S.actionDesc}>Paste your interview link to begin</p>
              </div>
            </div>
            <form onSubmit={handleJoin} style={S.joinForm}>
              <div style={S.joinInputWrap}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <input
                  value={campaignId}
                  onChange={e => setCampaignId(e.target.value)}
                  placeholder="Campaign ID or interview link…"
                  style={S.joinInput}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={S.joinBtn}>
                Join Now
              </button>
            </form>
          </div>

          <div style={S.actionsGrid}>
          {/* Practice */}
          <div style={S.actionCard} onClick={() => navigate('/mock')} role="button" tabIndex={0}>
            <div style={{ ...S.actionAccent, background: 'linear-gradient(135deg, #7353F6, #a78bfa)' }} />
            <div style={S.actionCardBody}>
              <span style={S.actionEmoji}>🎯</span>
              <h3 style={S.actionCardTitle}>Mock Interview</h3>
              <p style={S.actionCardDesc}>Practice with AI questions and get instant feedback</p>
              <span style={S.actionLink}>Start Practice →</span>
            </div>
          </div>

          {/* Profile */}
          <div style={S.actionCard} onClick={() => navigate('/profile')} role="button" tabIndex={0}>
            <div style={{ ...S.actionAccent, background: 'linear-gradient(135deg, #22c55e, #4ade80)' }} />
            <div style={S.actionCardBody}>
              <span style={S.actionEmoji}>👤</span>
              <h3 style={S.actionCardTitle}>My Profile</h3>
              <p style={S.actionCardDesc}>Update your info and upload your resume</p>
              <span style={S.actionLink}>Edit Profile →</span>
            </div>
          </div>

          {/* ATS Score */}
          <div style={S.actionCard} onClick={() => navigate('/candidate/ats-report')} role="button" tabIndex={0}>
            <div style={{ ...S.actionAccent, background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }} />
            <div style={S.actionCardBody}>
              <span style={S.actionEmoji}>📊</span>
              <h3 style={S.actionCardTitle}>ATS Score</h3>
              <p style={S.actionCardDesc}>Analyze your resume against any job description</p>
              <span style={S.actionLink}>Check Score →</span>
            </div>
          </div>
          </div>
        </div>

        {/* ── Link Modal ── */}
        <LinkModal
          isOpen={showLinkModal}
          onClose={() => setShowLinkModal(false)}
          mode="candidate"
          userId={currentUser.uid}
          userEmail={currentUser.email}
          onLinkCreated={() => setLinkRefresh(r => r + 1)}
        />

        {/* ── My Mock Links ── */}
        <h2 style={{ ...S.sectionTitle, marginTop: '40px' }}>My Mock Links</h2>
        <LinkList userId={currentUser.uid} mode="candidate" refresh={linkRefresh} />

        {/* ── Past Sessions ── */}
        <h2 style={{ ...S.sectionTitle, marginTop: '40px' }}>Interview History</h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <span className="spinner" style={{ width: '32px', height: '32px' }} />
          </div>
        ) : sessions.length === 0 ? (
          <div style={S.emptyState}>
            <div style={S.emptyIcon}>📭</div>
            <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '22px', marginBottom: '8px' }}>No interviews yet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
              Join a campaign or start a mock interview to get started.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Link to="/mock" className="btn btn-primary" style={{ padding: '10px 24px' }}>Practice Now</Link>
            </div>
          </div>
        ) : (
          <div style={S.sessionList}>
            {sessions.map(s => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SessionCard({ session }) {
  const hasDate = session.startedAt && typeof session.startedAt.toDate === 'function'
  const date = hasDate
    ? session.startedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A'
  const score = session.overallScore != null ? session.overallScore : null
  const isCompleted = session.status === 'completed'

  return (
    <div style={S.sessionCard}>
      <div style={{
        ...S.sessionAccent,
        background: isCompleted
          ? (score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#dc2626')
          : 'var(--primary)',
      }} />
      <div style={S.sessionBody}>
        <div style={S.sessionTop}>
          <div>
            <h3 style={S.sessionTitle}>{session.campaignTitle || 'Interview Session'}</h3>
            <p style={S.sessionDate}>{date}</p>
          </div>
          <span style={{
            ...S.statusPill,
            background: isCompleted ? '#f0fdf4' : '#fefce8',
            color: isCompleted ? '#16a34a' : '#ca8a04',
            borderColor: isCompleted ? '#bbf7d0' : '#fef08a',
          }}>
            {session.status || 'completed'}
          </span>
        </div>
        <div style={S.sessionBottom}>
          {score !== null ? (
            <div style={S.scoreBlock}>
              <span style={{
                ...S.scoreNum,
                color: score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#dc2626',
              }}>
                {score}
              </span>
              <span style={S.scoreMax}>/100</span>
            </div>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Score pending</span>
          )}
          {isCompleted && (
            <Link to={`/report/${session.id}`} className="btn btn-outline" style={{ padding: '8px 20px', fontSize: '13px' }}>
              View Report
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

const S = {
  // Hero
  heroBanner: {
    background: 'linear-gradient(135deg, #7353F6 0%, #5a3ed4 50%, #4c1d95 100%)',
    padding: '32px 36px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '20px',
  },
  heroContent: { display: 'flex', alignItems: 'center', gap: '20px' },
  heroAvatar: {
    width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontFamily: 'var(--font-head)',
    color: '#fff', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)',
  },
  heroTitle: { fontFamily: 'var(--font-head)', fontSize: '30px', color: '#fff', marginBottom: '2px' },
  heroSub: { fontSize: '14px', color: 'rgba(255,255,255,0.7)' },
  heroActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  heroBtn: {
    background: '#fff', color: 'var(--primary)', border: 'none', padding: '10px 22px',
    fontWeight: 700, fontSize: '13px', cursor: 'pointer', textDecoration: 'none',
  },
  heroBtnOutline: {
    background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.4)',
    padding: '10px 22px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', textDecoration: 'none',
  },

  // Stats
  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px',
  },
  statCard: {
    background: '#fff', border: '1px solid var(--border)', padding: '20px',
    display: 'flex', alignItems: 'center', gap: '16px',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    cursor: 'default',
  },
  statIcon: { fontSize: '28px', flexShrink: 0 },
  statValue: { fontFamily: 'var(--font-head)', fontSize: '32px', lineHeight: 1 },
  statLabel: { fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginTop: '2px' },

  // Section
  sectionTitle: {
    fontFamily: 'var(--font-head)', fontSize: '22px', letterSpacing: '0.04em', marginBottom: '16px',
    display: 'flex', alignItems: 'center', gap: '8px',
  },

  // Actions
  actionsOuter: { display: 'flex', flexDirection: 'column', gap: '16px' },
  actionsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px',
  },
  actionCardFeatured: {
    background: '#fff', border: '1px solid var(--border)',
    padding: '28px', transition: 'box-shadow 0.15s ease',
  },
  actionCardHeader: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' },
  actionIconCircle: {
    width: '48px', height: '48px', background: 'var(--primary-light)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', borderRadius: '50%', flexShrink: 0,
  },
  actionTitle: { fontFamily: 'var(--font-head)', fontSize: '20px', marginBottom: '2px' },
  actionDesc: { fontSize: '13px', color: 'var(--text-muted)' },
  joinForm: { display: 'flex', gap: '12px', alignItems: 'stretch' },
  joinInputWrap: {
    flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
    border: '2px solid var(--border)', padding: '0 14px',
    background: 'var(--bg-subtle)', transition: 'border-color 0.2s ease',
  },
  joinInput: {
    flex: 1, border: 'none', background: 'transparent', outline: 'none',
    fontSize: '14px', fontFamily: 'var(--font-body)', padding: '14px 0',
    color: 'var(--text)', width: '100%',
  },
  joinBtn: { padding: '14px 32px', fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap' },

  // Small action cards
  actionCard: {
    background: '#fff', border: '1px solid var(--border)', overflow: 'hidden',
    cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    position: 'relative',
  },
  actionAccent: { height: '4px', width: '100%' },
  actionCardBody: { padding: '24px 20px' },
  actionEmoji: { fontSize: '32px', display: 'block', marginBottom: '12px' },
  actionCardTitle: { fontFamily: 'var(--font-head)', fontSize: '18px', marginBottom: '6px' },
  actionCardDesc: { fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '16px' },
  actionLink: { fontSize: '13px', fontWeight: 700, color: 'var(--primary)' },

  // Empty state
  emptyState: {
    textAlign: 'center', padding: '60px 20px', background: '#fff',
    border: '1px solid var(--border)',
  },
  emptyIcon: { fontSize: '48px', marginBottom: '16px' },

  // Session list
  sessionList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  sessionCard: {
    display: 'flex', overflow: 'hidden', background: '#fff',
    border: '1px solid var(--border)', transition: 'box-shadow 0.15s ease',
  },
  sessionAccent: { width: '5px', flexShrink: 0 },
  sessionBody: { flex: 1, padding: '20px 24px' },
  sessionTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' },
  sessionTitle: { fontFamily: 'var(--font-head)', fontSize: '18px' },
  sessionDate: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' },
  statusPill: {
    fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
    padding: '4px 12px', border: '1px solid',
  },
  sessionBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  scoreBlock: { display: 'flex', alignItems: 'baseline', gap: '2px' },
  scoreNum: { fontFamily: 'var(--font-head)', fontSize: '36px', lineHeight: 1 },
  scoreMax: { fontSize: '14px', color: 'var(--text-muted)' },
}
