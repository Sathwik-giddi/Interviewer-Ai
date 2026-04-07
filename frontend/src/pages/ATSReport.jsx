/**
 * ATSReport — Detailed ATS Score Report for candidates
 * Shows matched/missing skills breakdown, score, and recommendations
 */
import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { apiUrl } from '../lib/runtimeConfig'

export default function ATSReport() {
  const { currentUser } = useAuth()
  const toast = useToast()

  const [resumeFile, setResumeFile] = useState(null)
  const [jobDesc, setJobDesc] = useState('')
  const [reqSkills, setReqSkills] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)

  async function handleAnalyze(e) {
    e.preventDefault()
    if (!resumeFile) { toast.error('Please upload a resume'); return }
    setLoading(true)

    const fd = new FormData()
    fd.append('resume', resumeFile)
    fd.append('job_description', jobDesc)
    fd.append('required_skills', reqSkills)

    try {
      const res = await fetch(apiUrl('/api/ats/score'), { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        setReport(data)
      } else {
        toast.error('Failed to analyze resume')
      }
    } catch {
      toast.error('Server error — is the backend running?')
    }
    setLoading(false)
  }

  return (
    <div className="page-enter" style={{ minHeight: 'calc(100vh - 60px)', background: 'var(--bg-subtle)' }}>
      <div className="container" style={{ padding: '32px 24px', maxWidth: '800px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ fontSize: '48px' }}>📊</span>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '36px', marginTop: '12px' }}>ATS SCORE REPORT</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Upload your resume and job description for a detailed skill match analysis</p>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleAnalyze} className="card" style={{ marginBottom: '24px' }}>
          <div className="form-group">
            <label>Resume (PDF / DOCX) *</label>
            <input type="file" accept=".pdf,.docx" onChange={e => setResumeFile(e.target.files[0])} />
          </div>
          <div className="form-group">
            <label>Job Description</label>
            <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder="Paste the job description here…" style={{ minHeight: '100px' }} />
          </div>
          <div className="form-group">
            <label>Required Skills (comma-separated)</label>
            <input value={reqSkills} onChange={e => setReqSkills(e.target.value)} placeholder="e.g. React, Node.js, TypeScript, Docker" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading || !resumeFile} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? <><span className="spinner" style={{ width: '16px', height: '16px' }} /> Analyzing…</> : 'Analyze Resume'}
          </button>
        </form>

        {/* Report Results */}
        {report && (
          <div className="page-enter">
            {/* Score Header */}
            <div className="card" style={{ marginBottom: '16px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <span style={{
                    fontFamily: 'var(--font-head)',
                    fontSize: '64px',
                    color: report.match_score >= 70 ? '#22c55e' : report.match_score >= 40 ? '#eab308' : '#dc2626',
                  }}>
                    {report.match_score}
                  </span>
                  <span style={{ fontSize: '24px', color: 'var(--text-muted)' }}>/100</span>
                </div>
              </div>

              <div style={{
                display: 'inline-block',
                padding: '6px 20px',
                background: report.eligible ? 'rgba(34,197,94,0.1)' : 'rgba(220,38,38,0.1)',
                border: `2px solid ${report.eligible ? '#22c55e' : '#dc2626'}`,
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: report.eligible ? '#22c55e' : '#dc2626',
              }}>
                {report.eligible ? 'ELIGIBLE' : 'BELOW THRESHOLD'}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Minimum threshold: {report.threshold || 60}%
              </p>
            </div>

            {/* Score Bar */}
            <div className="card" style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>MATCH SCORE</p>
              <div style={{ height: '12px', background: 'var(--border)', width: '100%', position: 'relative' }}>
                <div style={{
                  height: '100%',
                  width: `${report.match_score}%`,
                  background: report.match_score >= 70 ? '#22c55e' : report.match_score >= 40 ? '#eab308' : '#dc2626',
                  transition: 'width 0.6s ease',
                }} />
                {/* Threshold marker */}
                <div style={{
                  position: 'absolute',
                  left: '60%',
                  top: '-4px',
                  bottom: '-4px',
                  width: '2px',
                  background: 'var(--text)',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>0%</span>
                <span>Threshold (60%)</span>
                <span>100%</span>
              </div>
            </div>

            {/* Skills Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              {/* Matched Skills */}
              <div className="card">
                <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#22c55e', marginBottom: '12px' }}>
                  MATCHED SKILLS ({report.matched_skills?.length || 0})
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(report.matched_skills || []).map((s, i) => (
                    <span key={i} style={{
                      padding: '4px 10px',
                      background: 'rgba(34,197,94,0.1)',
                      border: '1px solid #22c55e',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#16a34a',
                    }}>
                      {s}
                    </span>
                  ))}
                  {(!report.matched_skills || report.matched_skills.length === 0) && (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No matched skills found</p>
                  )}
                </div>
              </div>

              {/* All Found Skills */}
              <div className="card">
                <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '12px' }}>
                  ALL DETECTED SKILLS ({report.skills?.length || 0})
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(report.skills || []).map((s, i) => {
                    const isMatched = report.matched_skills?.includes(s)
                    return (
                      <span key={i} style={{
                        padding: '4px 10px',
                        background: isMatched ? 'var(--primary-light)' : 'var(--bg-subtle)',
                        border: `1px solid ${isMatched ? 'var(--primary)' : 'var(--border)'}`,
                        fontSize: '12px',
                        fontWeight: isMatched ? 700 : 400,
                        color: isMatched ? 'var(--primary)' : 'var(--text-muted)',
                      }}>
                        {s}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Experience & AI Feedback */}
            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>EXPERIENCE</p>
                  <p style={{ fontFamily: 'var(--font-head)', fontSize: '28px' }}>
                    {report.years_experience || 0} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>years</span>
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>RECOMMENDATION</p>
                  <span className={`badge badge-${report.eligible ? 'success' : 'danger'}`} style={{ fontSize: '14px', padding: '6px 16px' }}>
                    {(report.recommendation || 'pending').toUpperCase()}
                  </span>
                </div>
              </div>

              {report.feedback && (
                <>
                  <hr className="divider" style={{ margin: '12px 0' }} />
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>AI FEEDBACK</p>
                  <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text)' }}>{report.feedback}</p>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => { setReport(null); setResumeFile(null) }}>
                Analyze Another Resume
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
