/**
 * HRCandidates — Candidate management for HR
 * Add candidates, upload resumes, ATS scoring, threshold handling, schedule interviews
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { collection, getDocs, addDoc, doc, updateDoc, query, where, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { apiUrl, interviewUrl } from '../lib/runtimeConfig'

export default function HRCandidates() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all') // all | eligible | rejected | pending

  // Add candidate form
  const [form, setForm] = useState({ name: '', email: '', phone: '', jobTitle: '', jobDescription: '' })
  const [resumeFile, setResumeFile] = useState(null)
  const [parsedResume, setParsedResume] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadCandidates() }, [currentUser])

  async function loadCandidates() {
    setLoading(true)
    try {
      const snap = await Promise.race([
        getDocs(query(collection(db, 'candidates'), where('hrId', '==', currentUser.uid), orderBy('createdAt', 'desc'))),
        new Promise((_, r) => setTimeout(() => r(), 5000)),
      ])
      setCandidates(snap?.docs?.map(d => ({ id: d.id, ...d.data() })) || [])
    } catch {
      // Fallback to localStorage
      try {
        setCandidates(JSON.parse(localStorage.getItem('hr_candidates') || '[]'))
      } catch {}
    }
    setLoading(false)
  }

  async function handleResumeUpload(file) {
    setResumeFile(file)
    if (!file) { setParsedResume(null); return }
    setParsing(true)
    try {
      const fd = new FormData()
      fd.append('resume', file)
      fd.append('job_description', form.jobDescription || form.jobTitle)
      fd.append('required_skills', form.jobTitle)
      const res = await fetch(apiUrl('/api/parse-resume'), { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        setParsedResume(data)
        toast.info(`Resume parsed: ${data.skills?.length || 0} skills, ${data.match_score}% match`)
      }
    } catch (err) {
      toast.error('Resume parsing failed')
    }
    setParsing(false)
  }

  async function handleAddCandidate(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) { toast.error('Name and email required'); return }
    setSaving(true)

    const candidate = {
      ...form,
      hrId: currentUser.uid,
      atsScore: parsedResume?.match_score ?? null,
      skills: parsedResume?.skills || [],
      matchedSkills: parsedResume?.matched_skills || [],
      yearsExperience: parsedResume?.years_experience || 0,
      status: parsedResume ? (parsedResume.match_score >= 60 ? 'eligible' : 'rejected') : 'pending',
      recommendation: parsedResume ? (parsedResume.match_score >= 60 ? 'eligible' : 'below-threshold') : 'pending',
      createdAt: new Date().toISOString(),
    }

    try {
      const docRef = await addDoc(collection(db, 'candidates'), candidate)
      candidate.id = docRef.id
    } catch {
      candidate.id = 'local-' + Date.now()
      // Save to localStorage
      const all = JSON.parse(localStorage.getItem('hr_candidates') || '[]')
      all.unshift(candidate)
      localStorage.setItem('hr_candidates', JSON.stringify(all))
    }

    setCandidates(prev => [candidate, ...prev])
    setForm({ name: '', email: '', phone: '', jobTitle: '', jobDescription: '' })
    setResumeFile(null)
    setParsedResume(null)
    setShowForm(false)
    setSaving(false)
    toast.success(`Candidate ${candidate.name} added! Status: ${candidate.status}`)
  }

  async function scheduleInterview(candidate) {
    const roomId = `interview-${candidate.id.substring(0, 8)}-${Date.now().toString(36)}`
    const link = interviewUrl(roomId)

    // Update candidate with interview link
    try {
      await updateDoc(doc(db, 'candidates', candidate.id), { interviewLink: link, interviewRoomId: roomId })
    } catch {}

    setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, interviewLink: link, interviewRoomId: roomId } : c))
    navigator.clipboard.writeText(link)
    toast.success('Interview link created and copied!')
  }

  const filtered = candidates.filter(c => {
    if (filter === 'eligible') return c.status === 'eligible'
    if (filter === 'rejected') return c.status === 'rejected'
    if (filter === 'pending') return c.status === 'pending'
    return true
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)' }}>
        <span className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    )
  }

  return (
    <div className="page-enter app-page dashboard-page candidates-page" style={{ minHeight: 'calc(100vh - 60px)', background: 'var(--bg-subtle)' }}>
      <div className="container page-shell" style={{ padding: '32px 24px' }}>
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '36px' }}>CANDIDATES</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{candidates.length} total candidates</p>
          </div>
          <div className="responsive-toolbar" style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? '✕ Close' : '+ Add Candidate'}
            </button>
            <button className="btn btn-outline" style={{ fontSize: '12px' }} onClick={() => navigate('/hr')}>Dashboard</button>
          </div>
        </div>

        {/* Add Candidate Form */}
        {showForm && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '20px', marginBottom: '16px' }}>ADD CANDIDATE</h3>
            <form onSubmit={handleAddCandidate}>
              <div className="split-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" required />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" required />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 555-0000" />
                </div>
                <div className="form-group">
                  <label>Job Title</label>
                  <input value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} placeholder="Frontend Developer" />
                </div>
              </div>
              <div className="form-group">
                <label>Job Description</label>
                <textarea value={form.jobDescription} onChange={e => setForm({ ...form, jobDescription: e.target.value })} placeholder="Paste JD for ATS scoring..." style={{ minHeight: '60px' }} />
              </div>
              <div className="form-group">
                <label>Resume (PDF / DOCX)</label>
                <input type="file" accept=".pdf,.docx" onChange={e => handleResumeUpload(e.target.files[0])} />
                {parsing && <p style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '4px' }}>Parsing resume...</p>}
              </div>

              {/* ATS Result */}
              {parsedResume && (
                <div style={{ padding: '14px', border: `2px solid ${parsedResume.match_score >= 60 ? '#22c55e' : '#dc2626'}`, background: parsedResume.match_score >= 60 ? '#f0fdf4' : '#fef2f2', marginBottom: '16px' }}>
                  <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>
                      {parsedResume.match_score >= 60 ? '✅ ELIGIBLE' : '❌ BELOW THRESHOLD'}
                    </span>
                    <span style={{ fontFamily: 'var(--font-head)', fontSize: '28px', color: parsedResume.match_score >= 60 ? '#22c55e' : '#dc2626' }}>
                      {parsedResume.match_score}%
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    {parsedResume.match_score >= 60
                      ? 'Candidate meets the ATS threshold. Interview scheduling enabled.'
                      : 'Candidate does not meet the minimum 60% ATS score. Interview scheduling disabled.'}
                  </p>
                  {parsedResume.skills?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {parsedResume.skills.slice(0, 10).map((s, i) => (
                        <span key={i} style={{ fontSize: '11px', padding: '2px 6px', background: parsedResume.matched_skills?.includes(s) ? '#dcfce7' : '#f1f5f9', fontWeight: parsedResume.matched_skills?.includes(s) ? 700 : 400, color: parsedResume.matched_skills?.includes(s) ? '#16a34a' : '#666' }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
                {saving ? 'Saving...' : 'Add Candidate'}
              </button>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="filter-row" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[['all', 'All'], ['eligible', 'Eligible'], ['rejected', 'Rejected'], ['pending', 'Pending']].map(([k, l]) => (
            <button key={k} className={`btn ${filter === k ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: '12px' }} onClick={() => setFilter(k)}>
              {l} ({candidates.filter(c => k === 'all' ? true : c.status === k).length})
            </button>
          ))}
        </div>

        {/* Candidate List */}
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <span style={{ fontSize: '48px' }}>👤</span>
            <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>No candidates yet. Click "Add Candidate" to get started.</p>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)' }} className="table-scroll candidate-table">
            <div className="dashboard-table" style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 150px', padding: '12px 16px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              <span>Name</span><span>Email</span><span>ATS Score</span><span>Status</span><span>Skills</span><span>Actions</span>
            </div>
            {filtered.map(c => (
              <div key={c.id} className="dashboard-table" style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 150px', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '13px', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>{c.email}</span>
                <span style={{ fontWeight: 700, color: (c.atsScore || 0) >= 60 ? '#22c55e' : (c.atsScore || 0) >= 40 ? '#eab308' : '#dc2626' }}>
                  {c.atsScore != null ? `${c.atsScore}%` : '—'}
                </span>
                <span>
                  <span className={`badge badge-${c.status === 'eligible' ? 'success' : c.status === 'rejected' ? 'danger' : 'warning'}`} style={{ fontSize: '10px' }}>
                    {c.status}
                  </span>
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{(c.skills || []).slice(0, 3).join(', ')}</span>
                <div className="responsive-actions" style={{ display: 'flex', gap: '4px' }}>
                  {c.status === 'eligible' && !c.interviewLink && (
                    <button className="btn btn-primary" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => scheduleInterview(c)}>Schedule</button>
                  )}
                  {c.interviewLink && (
                    <button className="btn btn-outline" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => { navigator.clipboard.writeText(c.interviewLink); toast.info('Link copied!') }}>Copy Link</button>
                  )}
                  {c.interviewRoomId && (
                    <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => navigate(`/observe/${c.interviewRoomId}`)}>Observe</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
