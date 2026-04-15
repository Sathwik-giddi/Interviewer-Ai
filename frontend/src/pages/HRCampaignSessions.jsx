/**
 * HRCampaignSessions — shows all candidate sessions for a campaign.
 * Route: /hr/campaign/:campaignId/sessions
 */
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function HRCampaignSessions() {
  const { campaignId } = useParams()
  const navigate = useNavigate()

  const [campaign, setCampaign]   = useState(null)
  const [sessions, setSessions]   = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      // Load campaign meta
      const cSnap = await getDoc(doc(db, 'campaigns', campaignId))
      if (cSnap.exists()) setCampaign({ id: cSnap.id, ...cSnap.data() })

      // Load all sessions for this campaign
      try {
        const q = query(
          collection(db, 'sessions'),
          where('campaignId', '==', campaignId)
        )
        const snap = await getDocs(q)
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        data.sort((a, b) => {
          const da = a.startedAt?.toDate ? a.startedAt.toDate() : new Date(a.startedAt || 0)
          const db = b.startedAt?.toDate ? b.startedAt.toDate() : new Date(b.startedAt || 0)
          return db - da
        })
        setSessions(data)
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
    load()
  }, [campaignId])

  const avgScore = sessions.length
    ? Math.round(sessions.reduce((a, s) => a + (s.overallScore ?? 0), 0) / sessions.length)
    : null

  return (
    <div className="page-enter app-page dashboard-page sessions-page" style={{ minHeight: 'calc(100vh - 60px)', background: 'var(--bg-subtle)' }}>
      <div className="container page-shell" style={{ padding: '32px 24px' }}>

        {/* Back + Header */}
        <button className="btn btn-ghost" style={{ marginBottom: '20px', fontSize: '13px' }} onClick={() => navigate('/hr')}>
          ← Back to Dashboard
        </button>

        {campaign && (
          <>
            <div style={styles.pageHeader} className="page-header">
              <div>
                <h1 style={styles.pageTitle}>{campaign.title}</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                  {campaign.requiredSkills} · {campaign.experienceYears} yrs experience
                </p>
              </div>
              <div style={styles.statRow} className="responsive-toolbar">
                <div style={styles.stat}>
                  <span style={styles.statNum}>{sessions.length}</span>
                  <span style={styles.statLabel}>Candidates</span>
                </div>
                {avgScore !== null && (
                  <div style={styles.stat}>
                    <span style={{ ...styles.statNum, color: scoreColor(avgScore) }}>{avgScore}</span>
                    <span style={styles.statLabel}>Avg Score</span>
                  </div>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/observe/${campaignId}`)}
                  style={{ alignSelf: 'center' }}
                >
                  👁 Observe Live
                </button>
              </div>
            </div>
            <hr className="divider" style={{ margin: '24px 0' }} />
          </>
        )}

        {/* Sessions table */}
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '22px', marginBottom: '16px' }}>
          CANDIDATE SESSIONS
        </h2>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <span className="spinner" />
          </div>
        ) : sessions.length === 0 ? (
          <div style={styles.empty}>
            <p>No candidates have taken this interview yet.</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Share the invite link from your dashboard.
            </p>
          </div>
        ) : (
          <div style={styles.tableWrapper} className="table-scroll">
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>Candidate</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Match Score</th>
                  <th style={styles.th}>Overall Score</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Recommendation</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => {
                  const date = s.startedAt?.toDate
                    ? s.startedAt.toDate().toLocaleDateString()
                    : (s.startedAt ? new Date(s.startedAt).toLocaleDateString() : 'N/A')
                  return (
                    <tr key={s.id} style={{ ...styles.row, background: i % 2 === 0 ? 'var(--bg)' : 'var(--bg-subtle)' }}>
                      <td style={styles.td}>
                        <span style={{ fontSize: '12px', color: s.candidateName ? 'var(--text)' : 'var(--text-muted)', fontFamily: s.candidateName ? 'inherit' : 'monospace' }}>
                          {s.candidateName || `${s.candidateId?.slice(0, 8)}…`}
                        </span>
                      </td>
                      <td style={styles.td}>{date}</td>
                      <td style={styles.td}>
                        {s.matchScore != null
                          ? <span style={{ color: scoreColor(s.matchScore), fontWeight: 700 }}>{s.matchScore}%</span>
                          : '—'}
                      </td>
                      <td style={styles.td}>
                        {s.overallScore != null
                          ? <span style={{ fontFamily: 'var(--font-head)', fontSize: '20px', color: scoreColor(s.overallScore) }}>{s.overallScore}</span>
                          : <span style={{ color: 'var(--text-muted)' }}>Pending</span>}
                      </td>
                      <td style={styles.td}>
                        <span className={`badge badge-${statusColor(s.status)}`}>{s.status || 'unknown'}</span>
                      </td>
                      <td style={styles.td}>
                        {s.evaluation?.recommendation
                          ? <RecommendationBadge rec={s.evaluation.recommendation} />
                          : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>}
                      </td>
                      <td style={styles.td}>
                        {s.status === 'completed' && (
                          <Link
                            to={`/report/${s.id}`}
                            className="btn btn-ghost"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            View Report
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function RecommendationBadge({ rec }) {
  const map = {
    hire:     { cls: 'badge-success', label: '✓ Hire' },
    consider: { cls: 'badge-warning', label: '~ Consider' },
    pass:     { cls: 'badge-danger',  label: '✗ Pass' },
  }
  const { cls, label } = map[rec] || { cls: '', label: rec }
  return <span className={`badge ${cls}`}>{label}</span>
}

function scoreColor(score) {
  if (score >= 70) return 'var(--success)'
  if (score >= 40) return 'var(--warning)'
  return 'var(--danger)'
}
function statusColor(s) {
  switch (s) {
    case 'completed':   return 'success'
    case 'in-progress': return 'warning'
    default:            return 'primary'
  }
}

const styles = {
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '20px',
  },
  pageTitle: {
    fontFamily: 'var(--font-head)',
    fontSize: '36px',
  },
  statRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '24px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderLeft: '2px solid var(--border)',
    paddingLeft: '20px',
  },
  statNum: {
    fontFamily: 'var(--font-head)',
    fontSize: '40px',
    lineHeight: 1,
    color: 'var(--text)',
  },
  statLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--text-muted)',
    fontWeight: 700,
    marginTop: '4px',
  },
  tableWrapper: {
    overflowX: 'auto',
    border: '1px solid var(--border)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  thead: {
    background: 'var(--bg-subtle)',
    borderBottom: '2px solid var(--border)',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  row: {
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '12px 16px',
    verticalAlign: 'middle',
  },
  empty: {
    padding: '60px',
    textAlign: 'center',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
  },
}
