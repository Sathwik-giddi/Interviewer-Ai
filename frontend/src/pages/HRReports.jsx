/**
 * HRReports — List all completed interviews with detailed reports
 * Includes per-question answers, scores, feedback, and PDF export
 */
import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

export default function HRReports() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState(null)
  const [filterScore, setFilterScore] = useState('all') // 'all' | 'high' | 'mid' | 'low'

  useEffect(() => { loadSessions() }, [currentUser])

  async function loadSessions() {
    setLoading(true)
    try {
      const q = query(collection(db, 'sessions'), where('hrId', '==', currentUser.uid))
      const snap = await Promise.race([
        getDocs(q),
        new Promise((_, r) => setTimeout(() => r(), 5000)),
      ])
      const data = snap?.docs?.map(d => ({ id: d.id, ...d.data() })) || []
      setSessions(data.sort((a, b) => {
        const da = a.startedAt?.toDate ? a.startedAt.toDate() : new Date(a.startedAt || 0)
        const db2 = b.startedAt?.toDate ? b.startedAt.toDate() : new Date(b.startedAt || 0)
        return db2 - da
      }))
    } catch {}
    setLoading(false)
  }

  const filtered = sessions.filter(s => {
    const score = s.overallScore || 0
    if (filterScore === 'high') return score >= 70
    if (filterScore === 'mid') return score >= 40 && score < 70
    if (filterScore === 'low') return score < 40
    return true
  })

  async function exportPDF(session) {
    try {
      const { jsPDF } = await import('jspdf')
      await import('jspdf-autotable')
      const doc = new jsPDF()
      const ev = session.evaluation || {}

      doc.setFontSize(20)
      doc.text('AI INTERVIEWER - EVALUATION REPORT', 14, 22)
      doc.setFontSize(12)
      doc.text(`Candidate: ${session.candidateName || 'Unknown'}`, 14, 35)
      doc.text(`Date: ${session.startedAt?.toDate ? session.startedAt.toDate().toLocaleString() : 'N/A'}`, 14, 42)
      doc.text(`Overall Score: ${session.overallScore || 'N/A'}/100`, 14, 49)
      doc.text(`Recommendation: ${(ev.recommendation || 'N/A').toUpperCase()}`, 14, 56)

      if (ev.summary) {
        doc.setFontSize(10)
        doc.text('Summary:', 14, 68)
        const lines = doc.splitTextToSize(ev.summary, 180)
        doc.text(lines, 14, 74)
      }

      // Questions table
      const answers = session.answers || []
      if (answers.length > 0) {
        const tableData = answers.map((a, i) => {
          const qEval = ev.questionEvals?.[i] || {}
          return [
            `Q${i + 1}`,
            (a.question || '').substring(0, 60),
            (a.answer || '').substring(0, 80),
            qEval.score ? `${qEval.score}/10` : 'N/A',
            (qEval.feedback || '').substring(0, 60),
          ]
        })

        doc.autoTable({
          startY: ev.summary ? 90 : 68,
          head: [['#', 'Question', 'Answer', 'Score', 'Feedback']],
          body: tableData,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [115, 83, 246] },
        })
      }

      if (ev.strengths?.length) {
        const y = doc.lastAutoTable?.finalY || 100
        doc.setFontSize(10)
        doc.text('Strengths:', 14, y + 10)
        ev.strengths.forEach((s, i) => doc.text(`+ ${s}`, 18, y + 17 + i * 6))
      }

      doc.save(`interview-report-${session.id}.pdf`)
      toast.success('PDF exported!')
    } catch (err) {
      toast.error('PDF export failed: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)' }}>
        <span className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    )
  }

  // Detail view
  if (selectedSession) {
    const s = selectedSession
    const ev = s.evaluation || {}
    const answers = s.answers || []
    const date = s.startedAt?.toDate ? s.startedAt.toDate().toLocaleString() : 'N/A'

    return (
      <div className="page-enter" style={{ minHeight: 'calc(100vh - 60px)', background: 'var(--bg-subtle)' }}>
        <div className="container" style={{ padding: '32px 24px', maxWidth: '800px' }}>
          <button className="btn btn-ghost" style={{ marginBottom: '16px' }} onClick={() => setSelectedSession(null)}>
            ← Back to Reports
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '32px' }}>
                {s.candidateName || 'Candidate Report'}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{date} · {s.campaignTitle || s.id}</p>
            </div>
            <div style={{ textAlign: 'center', border: '2px solid var(--border)', padding: '12px 20px' }}>
              <p style={{ fontFamily: 'var(--font-head)', fontSize: '40px', color: sc(s.overallScore || 0) }}>{s.overallScore || '—'}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/100</p>
            </div>
          </div>

          {ev.recommendation && (
            <div style={{ marginBottom: '16px' }}>
              <span className={`badge badge-${ev.recommendation === 'hire' ? 'success' : ev.recommendation === 'consider' ? 'warning' : 'danger'}`} style={{ fontSize: '13px', padding: '6px 16px' }}>
                {ev.recommendation.toUpperCase()}
              </span>
            </div>
          )}

          {ev.summary && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '18px', marginBottom: '8px' }}>SUMMARY</h3>
              <p style={{ fontSize: '14px', lineHeight: '1.8' }}>{ev.summary}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {ev.strengths?.length > 0 && (
              <div className="card">
                <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '16px', color: '#22c55e', marginBottom: '8px' }}>STRENGTHS</h3>
                {ev.strengths.map((st, i) => <p key={i} style={{ fontSize: '13px', marginBottom: '4px' }}>+ {st}</p>)}
              </div>
            )}
            {ev.areasToImprove?.length > 0 && (
              <div className="card">
                <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '16px', color: '#dc2626', marginBottom: '8px' }}>AREAS TO IMPROVE</h3>
                {ev.areasToImprove.map((a, i) => <p key={i} style={{ fontSize: '13px', marginBottom: '4px' }}>- {a}</p>)}
              </div>
            )}
          </div>

          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '18px', marginBottom: '12px' }}>QUESTION BREAKDOWN</h3>
          {answers.map((a, i) => {
            const qe = ev.questionEvals?.[i] || {}
            return (
              <div key={i} className="card" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                    <span style={{ fontFamily: 'var(--font-head)', fontSize: '20px', color: 'var(--primary)' }}>Q{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>{a.question}</p>
                      <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '10px 12px', marginBottom: '8px' }}>
                        {a.type === 'code' ? <pre style={{ margin: 0, fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{a.answer}</pre> : <p style={{ fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{a.answer || 'No answer'}</p>}
                      </div>
                      {qe.feedback && (
                        <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)', padding: '8px 12px', fontSize: '13px' }}>
                          <strong style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Feedback: </strong>
                          {qe.feedback}
                        </div>
                      )}
                    </div>
                  </div>
                  {qe.score != null && (
                    <div style={{ textAlign: 'right', marginLeft: '12px' }}>
                      <span style={{ fontFamily: 'var(--font-head)', fontSize: '24px', color: sc(qe.score * 10) }}>{qe.score}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/10</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button className="btn btn-primary" onClick={() => exportPDF(s)}>Export PDF</button>
            <button className="btn btn-outline" onClick={() => window.print()}>Print</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter" style={{ minHeight: 'calc(100vh - 60px)', background: 'var(--bg-subtle)' }}>
      <div className="container" style={{ padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '36px' }}>FEEDBACK REPORTS</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{filtered.length} interview reports</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[['all', 'All'], ['high', '70+'], ['mid', '40-69'], ['low', '<40']].map(([k, l]) => (
              <button key={k} className={`btn ${filterScore === k ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: '12px' }} onClick={() => setFilterScore(k)}>{l}</button>
            ))}
            <button className="btn btn-outline" style={{ fontSize: '12px' }} onClick={() => navigate('/hr')}>Dashboard</button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <span style={{ fontSize: '48px' }}>📋</span>
            <p style={{ fontSize: '16px', color: 'var(--text-muted)', marginTop: '16px' }}>No reports yet. Completed interviews will appear here.</p>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)' }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 120px', padding: '12px 16px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              <span>Candidate</span><span>Campaign</span><span>Score</span><span>Recommendation</span><span>Date</span><span>Actions</span>
            </div>
            {filtered.map(s => {
              const date = s.startedAt?.toDate ? s.startedAt.toDate().toLocaleDateString() : '—'
              const ev = s.evaluation || {}
              return (
                <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 120px', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '13px', alignItems: 'center', cursor: 'pointer' }} onClick={() => setSelectedSession(s)}>
                  <span style={{ fontWeight: 600 }}>{s.candidateName || 'Unknown'}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{s.campaignTitle || s.id?.substring(0, 12)}</span>
                  <span style={{ fontWeight: 700, color: sc(s.overallScore || 0) }}>{s.overallScore || '—'}/100</span>
                  <span>
                    {ev.recommendation && (
                      <span className={`badge badge-${ev.recommendation === 'hire' ? 'success' : ev.recommendation === 'consider' ? 'warning' : 'danger'}`} style={{ fontSize: '10px' }}>
                        {ev.recommendation}
                      </span>
                    )}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{date}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={e => { e.stopPropagation(); setSelectedSession(s) }}>View</button>
                    <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={e => { e.stopPropagation(); exportPDF(s) }}>PDF</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function sc(score) {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#eab308'
  return '#dc2626'
}
