/**
 * HRAnalytics — Analytics dashboard for HR with charts
 * Shows: total candidates, avg score, pass rate, score distribution, daily activity
 */
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts'

const COLORS = ['#22c55e', '#eab308', '#dc2626', '#7353F6', '#3b82f6']

export default function HRAnalytics() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('all') // 'all' | '7d' | '30d'
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => { loadData() }, [currentUser])

  async function loadData() {
    setLoading(true)
    try {
      // Load sessions
      const sessSnap = await Promise.race([
        getDocs(query(collection(db, 'sessions'), where('hrId', '==', currentUser.uid))),
        new Promise((_, r) => setTimeout(() => r(), 5000)),
      ])
      const sessData = sessSnap?.docs?.map(d => ({ id: d.id, ...d.data() })) || []
      setSessions(sessData)

      // Load campaigns
      const campSnap = await Promise.race([
        getDocs(query(collection(db, 'campaigns'), where('hrId', '==', currentUser.uid))),
        new Promise((_, r) => setTimeout(() => r(), 5000)),
      ])
      setCampaigns(campSnap?.docs?.map(d => ({ id: d.id, ...d.data() })) || [])
    } catch {
      // Use localStorage fallback
      try {
        const links = JSON.parse(localStorage.getItem('hr_quick_links') || '[]')
        setCampaigns(links.map(l => ({ id: l.id, title: l.title, createdAt: l.createdAt })))
      } catch {}
    }
    setLoading(false)
  }

  // Filter sessions by date range
  const filtered = sessions.filter(s => {
    if (dateRange === '7d') {
      const d = s.startedAt?.toDate ? s.startedAt.toDate() : new Date(s.startedAt)
      return (Date.now() - d.getTime()) < 7 * 86400000
    }
    if (dateRange === '30d') {
      const d = s.startedAt?.toDate ? s.startedAt.toDate() : new Date(s.startedAt)
      return (Date.now() - d.getTime()) < 30 * 86400000
    }
    return true
  })

  // Aggregated stats
  const totalCandidates = filtered.length
  const completedSessions = filtered.filter(s => s.status === 'completed' || s.overallScore != null)
  const avgScore = completedSessions.length > 0 ? Math.round(completedSessions.reduce((a, s) => a + (s.overallScore || 0), 0) / completedSessions.length) : 0
  const passRate = completedSessions.length > 0 ? Math.round(completedSessions.filter(s => (s.overallScore || 0) >= 60).length / completedSessions.length * 100) : 0
  const hireCount = completedSessions.filter(s => s.evaluation?.recommendation === 'hire').length
  const considerCount = completedSessions.filter(s => s.evaluation?.recommendation === 'consider').length
  const passCount = completedSessions.filter(s => s.evaluation?.recommendation === 'pass').length

  // Score distribution for bar chart
  const scoreDistribution = [
    { range: '0-20', count: completedSessions.filter(s => (s.overallScore||0) <= 20).length },
    { range: '21-40', count: completedSessions.filter(s => (s.overallScore||0) > 20 && (s.overallScore||0) <= 40).length },
    { range: '41-60', count: completedSessions.filter(s => (s.overallScore||0) > 40 && (s.overallScore||0) <= 60).length },
    { range: '61-80', count: completedSessions.filter(s => (s.overallScore||0) > 60 && (s.overallScore||0) <= 80).length },
    { range: '81-100', count: completedSessions.filter(s => (s.overallScore||0) > 80).length },
  ]

  // Recommendation pie chart
  const recData = [
    { name: 'Hire', value: hireCount || 1 },
    { name: 'Consider', value: considerCount || 1 },
    { name: 'Pass', value: passCount || 1 },
  ]

  // Daily activity (last 7 days)
  const dailyActivity = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const count = filtered.filter(s => {
      const sd = s.startedAt?.toDate ? s.startedAt.toDate() : new Date(s.startedAt)
      return sd.toDateString() === d.toDateString()
    }).length
    return { day: key, interviews: count }
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)' }}>
        <span className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    )
  }

  return (
    <div className="page-enter app-page dashboard-page analytics-page" style={{ minHeight: 'calc(100vh - 60px)', background: 'var(--bg-subtle)' }}>
      <div className="container page-shell" style={{ padding: '32px 24px' }}>
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '36px' }}>ANALYTICS</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Interview performance metrics and insights</p>
          </div>
          <div className="responsive-toolbar" style={{ display: 'flex', gap: '8px' }}>
            {['all', '7d', '30d'].map(r => (
              <button key={r} className={`btn ${dateRange === r ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: '12px' }} onClick={() => setDateRange(r)}>
                {r === 'all' ? 'All Time' : r === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
            <button className="btn btn-outline" style={{ fontSize: '12px' }} onClick={() => navigate('/hr')}>
              Dashboard
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="stats-grid stats-grid--4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'Total Interviews', value: totalCandidates, color: 'var(--primary)' },
            { label: 'Avg Score', value: `${avgScore}/100`, color: avgScore >= 60 ? '#22c55e' : '#eab308' },
            { label: 'Pass Rate', value: `${passRate}%`, color: passRate >= 50 ? '#22c55e' : '#dc2626' },
            { label: 'Active Campaigns', value: campaigns.length, color: 'var(--primary)' },
          ].map((stat, i) => (
            <div key={i} className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>{stat.label}</p>
              <p style={{ fontFamily: 'var(--font-head)', fontSize: '36px', color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="split-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          {/* Score Distribution */}
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '18px', marginBottom: '16px' }}>SCORE DISTRIBUTION</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={scoreDistribution}>
                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#7353F6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recommendation Pie */}
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '18px', marginBottom: '16px' }}>RECOMMENDATIONS</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={recData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {recData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Activity */}
        <div className="card" style={{ marginBottom: '32px' }}>
          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '18px', marginBottom: '16px' }}>DAILY ACTIVITY (LAST 7 DAYS)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="interviews" stroke="#7353F6" strokeWidth={2} dot={{ fill: '#7353F6', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats */}
        <div className="three-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>HIRED</p>
            <p style={{ fontFamily: 'var(--font-head)', fontSize: '32px', color: '#22c55e' }}>{hireCount}</p>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>UNDER REVIEW</p>
            <p style={{ fontFamily: 'var(--font-head)', fontSize: '32px', color: '#eab308' }}>{considerCount}</p>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>REJECTED</p>
            <p style={{ fontFamily: 'var(--font-head)', fontSize: '32px', color: '#dc2626' }}>{passCount}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
