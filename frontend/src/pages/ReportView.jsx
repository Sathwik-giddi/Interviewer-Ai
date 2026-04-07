import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useToast } from '../components/Toast'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { apiUrl } from '../lib/runtimeConfig'

export default function ReportView() {
  const { sessionId } = useParams()
  const toast = useToast()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Try Firestore first
      try {
        const snap = await getDoc(doc(db, 'sessions', sessionId))
        if (snap.exists()) {
          setSession({ id: snap.id, ...snap.data() })
          setLoading(false)
          return
        }
      } catch {}

      // Fallback: backend API
      try {
        const res = await fetch(apiUrl(`/api/interview/report/${sessionId}`))
        if (res.ok) {
          const data = await res.json()
          setSession({ id: sessionId, ...data })
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [sessionId])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)' }}>
        <span className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    )
  }

  if (!session) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <p>Session not found.</p>
        <Link to="/candidate" className="btn btn-outline" style={{ marginTop: '16px' }}>Back</Link>
      </div>
    )
  }

  const score = session.overallScore ?? null
  const date = session.startedAt?.toDate ? session.startedAt.toDate().toLocaleString() : (session.startedAt || 'N/A')
  const answers = session.answers || []
  const evaluation = session.evaluation || null
  const violations = session.violations || []
  const recommendation = evaluation?.recommendation || session.recommendation || 'pending'
  const strengths = evaluation?.strengths || []
  const weaknesses = evaluation?.areasToImprove || []
  const duration = session.duration ? `${Math.floor(session.duration / 60)}m ${session.duration % 60}s` : null
  const candidateName = session.candidateName || 'Candidate'
  const jobTitle = session.campaignTitle || session.jobTitle || 'Interview Session'

  // Violation summary
  const violationSummary = {}
  violations.forEach(v => {
    const t = v.type || 'unknown'
    violationSummary[t] = (violationSummary[t] || 0) + 1
  })

  function recColor(rec) {
    if (rec === 'hire') return { bg: '#dcfce7', color: '#166534', label: 'HIRE' }
    if (rec === 'consider' || rec === 'maybe') return { bg: '#fef9c3', color: '#854d0e', label: 'MAYBE' }
    return { bg: '#fee2e2', color: '#991b1b', label: 'REJECT' }
  }
  const rec = recColor(recommendation)

  function shareLink() {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => toast.info('Report link copied!')).catch(() => {})
  }

  function exportPDF() {
    const pdf = new jsPDF()
    const pw = pdf.internal.pageSize.getWidth()

    // Title
    pdf.setFontSize(20)
    pdf.text('Interview Evaluation Report', pw / 2, 20, { align: 'center' })

    // Candidate info
    pdf.setFontSize(11)
    pdf.text(`Candidate: ${candidateName}`, 14, 35)
    pdf.text(`Role: ${jobTitle}`, 14, 42)
    pdf.text(`Date: ${date}`, 14, 49)
    if (duration) pdf.text(`Duration: ${duration}`, 14, 56)
    pdf.text(`Overall Score: ${score ?? 'N/A'}/100`, 14, 63)
    pdf.text(`Recommendation: ${rec.label}`, 14, 70)

    // Summary
    if (evaluation?.summary) {
      pdf.setFontSize(13)
      pdf.text('Summary', 14, 82)
      pdf.setFontSize(10)
      const lines = pdf.splitTextToSize(evaluation.summary, pw - 28)
      pdf.text(lines, 14, 90)
    }

    // Question table
    let startY = evaluation?.summary ? 90 + (pdf.splitTextToSize(evaluation.summary, pw - 28).length * 5) + 10 : 82
    if (answers.length > 0) {
      pdf.autoTable({
        startY: Math.min(startY, 180),
        head: [['#', 'Question', 'Score', 'Feedback']],
        body: answers.map((a, i) => {
          const ev = evaluation?.questionEvals?.[i] || evaluation?.questionEvals?.[String(i)] || {}
          return [
            `Q${i + 1}`,
            a.question?.substring(0, 80) || '',
            ev.score !== undefined ? `${ev.score}/10` : 'N/A',
            (ev.feedback || '').substring(0, 100),
          ]
        }),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [115, 83, 246] },
      })
    }

    // Violations
    if (violations.length > 0) {
      const vY = pdf.lastAutoTable?.finalY ? pdf.lastAutoTable.finalY + 10 : startY + 10
      pdf.setFontSize(12)
      pdf.text('Proctoring Violations', 14, vY)
      pdf.autoTable({
        startY: vY + 5,
        head: [['Type', 'Time', 'Details']],
        body: violations.map(v => [v.type || 'unknown', v.timestamp || '', v.details || '']),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [220, 38, 38] },
      })
    }

    pdf.save(`interview-report-${sessionId}.pdf`)
    toast.info('PDF downloaded!')
  }

  return (
    <div className="page-enter" style={{ background: 'var(--bg-subtle)', minHeight: 'calc(100vh - 60px)' }}>
      <div className="container" style={{ padding: '40px 24px', maxWidth: '900px' }}>

        {/* Header */}
        <div style={styles.header}>
          <div style={{ flex: 1 }}>
            <p style={styles.label}>Evaluation Report</p>
            <h1 style={styles.title}>{jobTitle}</h1>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{candidateName}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{date}</span>
              {duration && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Duration: {duration}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {score !== null && (
              <div style={styles.scoreCircle}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={scoreHex(score)} strokeWidth="8"
                    strokeDasharray={`${(score / 100) * 264} 264`}
                    strokeLinecap="round" transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dasharray 1s ease' }} />
                  <text x="50" y="46" textAnchor="middle" style={{ fontFamily: 'var(--font-head)', fontSize: '28px', fill: scoreHex(score) }}>{score}</text>
                  <text x="50" y="62" textAnchor="middle" style={{ fontSize: '11px', fill: '#999' }}>/100</text>
                </svg>
              </div>
            )}
            <div style={{ ...styles.recBadge, background: rec.bg, color: rec.color }}>
              {rec.label}
            </div>
          </div>
        </div>

        <hr className="divider" style={{ margin: '28px 0' }} />

        {/* Summary */}
        {evaluation?.summary && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 style={styles.sectionTitle}>OVERALL SUMMARY</h2>
            <p style={{ fontSize: '15px', lineHeight: '1.8', color: 'var(--text)', marginTop: '12px' }}>
              {evaluation.summary}
            </p>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="card">
              <h3 style={styles.sectionTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}>
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                STRENGTHS
              </h3>
              <ul style={styles.list}>
                {strengths.map((s, i) => <li key={i} style={styles.listItem}>{s}</li>)}
                {strengths.length === 0 && <li style={{ ...styles.listItem, color: 'var(--text-muted)' }}>No specific strengths noted</li>}
              </ul>
            </div>
            <div className="card">
              <h3 style={styles.sectionTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                AREAS TO IMPROVE
              </h3>
              <ul style={styles.list}>
                {weaknesses.map((w, i) => <li key={i} style={styles.listItem}>{w}</li>)}
                {weaknesses.length === 0 && <li style={{ ...styles.listItem, color: 'var(--text-muted)' }}>No areas flagged</li>}
              </ul>
            </div>
          </div>
        )}

        {/* Match score */}
        {session.matchScore !== undefined && (
          <div className="card" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div>
              <p style={styles.label}>Resume Match Score</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
                <span style={{ fontFamily: 'var(--font-head)', fontSize: '40px', color: scoreHex(session.matchScore) }}>
                  {session.matchScore}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>%</span>
              </div>
            </div>
            <div style={styles.matchBar}>
              <div style={{ ...styles.matchFill, width: `${session.matchScore}%`, background: scoreHex(session.matchScore) }} />
            </div>
          </div>
        )}

        {/* Per-question breakdown */}
        <h2 style={{ ...styles.sectionTitle, marginBottom: '16px' }}>QUESTION BREAKDOWN</h2>
        {answers.map((a, i) => {
          const eval_i = evaluation?.questionEvals?.[i] || evaluation?.questionEvals?.[String(i)] || {}
          return (
            <div key={i} className="card" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                  <span style={{ fontFamily: 'var(--font-head)', fontSize: '22px', color: 'var(--primary)', flexShrink: 0 }}>
                    Q{i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px' }}>{a.question}</p>
                    <div style={styles.answerBox}>
                      {a.type === 'code'
                        ? <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '13px', fontFamily: 'monospace' }}>{a.answer}</pre>
                        : <p style={{ fontSize: '14px', lineHeight: '1.7', margin: 0 }}>{a.answer || <em style={{ color: 'var(--text-muted)' }}>No answer provided</em>}</p>
                      }
                    </div>
                    {eval_i.feedback && (
                      <div style={styles.feedbackBox}>
                        <strong style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          AI Feedback
                        </strong>
                        <p style={{ fontSize: '14px', marginTop: '6px', lineHeight: '1.7' }}>{eval_i.feedback}</p>
                      </div>
                    )}
                  </div>
                </div>
                {eval_i.score !== undefined && (
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
                    <span style={{ fontFamily: 'var(--font-head)', fontSize: '28px', color: scoreHex(eval_i.score * 10) }}>
                      {eval_i.score}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/10</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Proctoring Violations */}
        <hr className="divider" style={{ margin: '32px 0' }} />
        <h2 style={{ ...styles.sectionTitle, marginBottom: '16px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          PROCTORING REPORT
        </h2>
        {violations.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" style={{ margin: '0 auto 12px', display: 'block' }}>
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p style={{ fontWeight: 700, fontSize: '15px', color: '#22c55e' }}>No proctoring issues detected</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>The candidate maintained focus throughout the interview.</p>
          </div>
        ) : (
          <>
            {/* Violation summary badges */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {Object.entries(violationSummary).map(([type, count]) => (
                <div key={type} style={styles.violBadge}>
                  <span style={{ fontWeight: 700, color: '#dc2626' }}>{count}x</span>
                  <span>{type.replace(/([A-Z])/g, ' $1').trim()}</span>
                </div>
              ))}
              <div style={{ ...styles.violBadge, background: '#fee2e2', borderColor: '#dc2626' }}>
                <span style={{ fontWeight: 700, color: '#dc2626' }}>Total: {violations.length}</span>
              </div>
            </div>

            {/* Violation timeline */}
            <div className="card" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {violations.map((v, i) => (
                <div key={i} style={{ ...styles.violRow, borderBottom: i < violations.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={styles.violDot} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', textTransform: 'capitalize' }}>
                      {(v.type || 'unknown').replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    {v.details && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{v.details}</p>}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{v.timestamp || ''}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <hr className="divider" style={{ margin: '32px 0' }} />
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/candidate" className="btn btn-ghost">← Back to Dashboard</Link>
          <button className="btn btn-primary" onClick={exportPDF}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export PDF
          </button>
          <button className="btn btn-outline" onClick={shareLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share Report
          </button>
          <button className="btn btn-outline" onClick={() => { toast.info('Printing…'); window.print() }}>Print</button>
        </div>
      </div>
    </div>
  )
}

function scoreHex(score) {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#eab308'
  return '#dc2626'
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '24px',
  },
  title: {
    fontFamily: 'var(--font-head)',
    fontSize: '36px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
  scoreCircle: {
    flexShrink: 0,
  },
  recBadge: {
    padding: '10px 20px',
    fontFamily: 'var(--font-head)',
    fontSize: '18px',
    letterSpacing: '0.1em',
    fontWeight: 700,
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: 'var(--font-head)',
    fontSize: '22px',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    marginTop: '12px',
  },
  listItem: {
    padding: '8px 0',
    fontSize: '14px',
    lineHeight: '1.6',
    borderBottom: '1px solid var(--border)',
  },
  answerBox: {
    background: 'var(--bg-subtle)',
    border: '1px solid var(--border)',
    padding: '12px 14px',
    marginBottom: '10px',
  },
  feedbackBox: {
    background: 'var(--primary-light)',
    border: '1px solid var(--primary)',
    padding: '12px 14px',
  },
  matchBar: {
    flex: 1,
    height: '8px',
    background: 'var(--border)',
  },
  matchFill: {
    height: '100%',
    transition: 'width 0.6s ease',
  },
  violBadge: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    padding: '6px 12px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    fontSize: '12px',
    fontWeight: 600,
  },
  violRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
  },
  violDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#dc2626',
    flexShrink: 0,
  },
}
