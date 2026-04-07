import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  {
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
    title: 'Dynamic Question Pools',
    desc: 'AI generates 20 role-specific questions per campaign. Candidates receive 5 tailored to their resume match score.',
  },
  {
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
    title: 'ATS Resume Parsing',
    desc: 'Automatically extracts skills, experience, and computes a match score against your job requirements — in seconds.',
  },
  {
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
    title: 'Live Code Editor',
    desc: 'Built-in Monaco code editor with syntax checking for technical interviews. Supports Python, Java, JavaScript, and more.',
  },
  {
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    title: 'AI Proctoring',
    desc: 'face-api.js monitors gaze direction, detects multiple faces, and flags suspicious activity in real time.',
  },
  {
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>,
    title: 'HR Live Monitoring',
    desc: 'HR can silently observe any interview live, then request to speak and pause the AI interviewer at any moment.',
  },
  {
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    title: 'Automated Evaluation',
    desc: 'Every answer is scored by AI against model answers and rubrics. A full evaluation report is generated automatically.',
  },
]

const COMPARISON = [
  ['Generic video call platforms', 'Purpose-built AI interview platform'],
  ['Manual question writing', 'AI-generated role-specific question pools'],
  ['No resume analysis', 'ATS resume parsing with match scoring'],
  ['No proctoring', 'Real-time face and gaze detection'],
  ['Passive HR viewing only', 'HR intervention with speak control'],
  ['Manual scoring', 'Automated AI evaluation reports'],
]

export default function Landing() {
  const { currentUser, userRole } = useAuth()
  const observerRef = useRef(null)
  const navigate = useNavigate()
  const [generatedLink, setGeneratedLink] = useState('')
  const [copied, setCopied] = useState(false)

  function generateLink() {
    const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    const url = `${window.location.origin}/interview/${id}`
    setGeneratedLink(url)
    setCopied(false)
  }

  function copyAndGo() {
    navigator.clipboard.writeText(generatedLink).catch(() => {})
    setCopied(true)
  }

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(el => {
          if (el.isIntersecting) {
            el.target.classList.add('visible')
            observerRef.current.unobserve(el.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    document.querySelectorAll('.fade-up').forEach(el => observerRef.current.observe(el))
    return () => observerRef.current?.disconnect()
  }, [])

  const ctaHref = currentUser
    ? userRole === 'hr' ? '/hr' : '/candidate'
    : '/signup'

  return (
    <div className="page-enter">
      {/* HERO */}
      <section style={styles.hero}>
        <div className="container" style={styles.heroInner}>
          <div style={styles.heroLeft}>
            <div className="fade-up" style={styles.heroBadge}>
              <span style={styles.heroBadgeDot} className="pulse" />
              AI-POWERED HIRING PLATFORM
            </div>
            <h1 className="fade-up" style={styles.heroTitle}>
              THE SMARTEST<br />
              <span className="gradient-text">AI INTERVIEWER</span><br />
              YOU'VE EVER MET
            </h1>
            <p className="fade-up" style={styles.heroSub}>
              Automated resume parsing, dynamic question pools, live proctoring,
              and instant evaluation reports — all in one platform.
            </p>
            <div className="fade-up" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link to={ctaHref} className="btn btn-primary" style={{ fontSize: '15px', padding: '14px 32px' }}>
                Get Started Free
              </Link>
              <a href="#features" className="btn btn-outline" style={{ fontSize: '15px', padding: '14px 32px' }}>
                See Features
              </a>
            </div>
            <div className="fade-up" style={styles.trustRow}>
              <div style={styles.trustAvatars}>
                {['#7353F6', '#38a169', '#d97706'].map((c, i) => (
                  <div key={i} style={{ ...styles.trustAvatar, background: c, marginLeft: i > 0 ? '-8px' : 0, zIndex: 3 - i }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                ))}
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Trusted by interviewers worldwide</span>
            </div>
          </div>
          <div className="fade-up" style={styles.heroRight}>
            <div style={styles.heroVisual}>
              <div style={styles.visualLabel}>
                <span style={styles.liveDot} className="pulse" />
                LIVE INTERVIEW
              </div>
              <div style={styles.visualScreen}>
                <div style={styles.faceBox}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div style={styles.questionCard}>
                  <div style={styles.qDot} />
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Describe your experience with distributed systems...
                  </span>
                </div>
              </div>
              <div style={styles.statusRow}>
                <span style={{ ...styles.liveDotGreen }} className="pulse" />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Proctoring active</span>
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--primary)', fontWeight: 700 }}>
                  Q 2 / 5
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK START */}
      <section style={{ padding: '72px 0', background: 'var(--bg-subtle)' }}>
        <div className="container" style={{ maxWidth: '640px', textAlign: 'center' }}>
          <h2 className="fade-up" style={{ fontFamily: 'var(--font-head)', fontSize: '40px', marginBottom: '12px' }}>
            START AN INTERVIEW <span className="gradient-text">NOW</span>
          </h2>
          <p className="fade-up" style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '28px' }}>
            No signup required. Generate a link and share it with anyone to start an AI-powered interview session instantly.
          </p>
          <div className="fade-up" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '15px' }} onClick={generateLink}>
              Generate Interview Link
            </button>
          </div>
          {generatedLink && (
            <div className="fade-up visible" style={styles.linkBox}>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
                YOUR INTERVIEW LINK
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  readOnly
                  value={generatedLink}
                  style={{ flex: 1, padding: '11px 14px', fontSize: '13px', fontFamily: 'monospace', border: '1.5px solid var(--border)', background: 'var(--bg-subtle)' }}
                  onClick={e => e.target.select()}
                />
                <button className="btn btn-outline" style={{ padding: '11px 18px', fontSize: '12px', flexShrink: 0 }} onClick={copyAndGo}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: '13px' }} onClick={() => navigate(generatedLink.replace(window.location.origin, ''))}>
                  Join as Candidate
                </button>
                {currentUser && (
                  <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', fontSize: '13px' }} onClick={() => navigate(generatedLink.replace(window.location.origin, '').replace('/interview/', '/observe/'))}>
                    Observe as HR
                  </button>
                )}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
                Share this link with candidates. They can join without creating an account.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={styles.section}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p className="fade-up" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '8px' }}>
              Platform Features
            </p>
            <h2 className="fade-up" style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(32px, 5vw, 56px)' }}>
              EVERYTHING YOU NEED
            </h2>
          </div>
          <div style={styles.featureGrid}>
            {FEATURES.map((f, i) => (
              <div key={i} className="fade-up" style={styles.featureCard}>
                <div style={styles.featureIcon}>{f.icon}</div>
                <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '22px', marginBottom: '10px' }}>{f.title}</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.7' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section style={{ ...styles.section, background: 'var(--bg-subtle)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 className="fade-up" style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(28px, 4vw, 48px)' }}>
              WHY DIFFERENT?
            </h2>
          </div>
          <div style={styles.compGrid}>
            <div style={styles.compCol}>
              <div style={styles.compHeader}>Others</div>
              {COMPARISON.map(([old], i) => (
                <div key={i} className="fade-up" style={{ ...styles.compRow, color: 'var(--text-muted)' }}>
                  <span style={{ color: '#ddd', marginRight: '12px', fontSize: '16px' }}>&#x2717;</span> {old}
                </div>
              ))}
            </div>
            <div style={{ width: '1px', background: 'var(--border)' }} />
            <div style={styles.compCol}>
              <div style={{ ...styles.compHeader, color: 'var(--primary)' }}>AI Interviewer</div>
              {COMPARISON.map(([, neu], i) => (
                <div key={i} className="fade-up" style={styles.compRow}>
                  <span style={{ color: 'var(--primary)', marginRight: '12px', fontSize: '16px' }}>&#x2713;</span> {neu}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '100px 0', background: 'linear-gradient(180deg, #fff 0%, #f5f3ff 100%)' }}>
        <div className="container text-center">
          <h2 className="fade-up" style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(36px, 6vw, 72px)', marginBottom: '16px' }}>
            READY TO INTERVIEW<br />
            <span className="gradient-text">SMARTER?</span>
          </h2>
          <p className="fade-up" style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '36px', maxWidth: '480px', margin: '0 auto 36px' }}>
            Create your account in under a minute. No credit card required.
          </p>
          <div className="fade-up" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup?role=hr" className="btn btn-primary" style={{ padding: '14px 36px', fontSize: '15px' }}>
              I'm Hiring
            </Link>
            <Link to="/signup?role=candidate" className="btn btn-outline" style={{ padding: '14px 36px', fontSize: '15px' }}>
              I'm a Candidate
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ fontFamily: 'var(--font-head)', fontSize: '18px', letterSpacing: '0.06em' }}>
            AI<span style={{ color: 'var(--primary)' }}>INTERVIEWER</span>
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            &copy; {new Date().getFullYear()} AI Interviewer.
          </span>
        </div>
      </footer>
    </div>
  )
}

const styles = {
  hero: {
    padding: '88px 0 80px',
  },
  heroInner: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '48px',
    alignItems: 'center',
  },
  heroLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: 'var(--primary)',
    background: 'var(--primary-light)',
    padding: '6px 14px',
    alignSelf: 'flex-start',
  },
  heroBadgeDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--primary)',
    display: 'inline-block',
  },
  heroTitle: {
    fontFamily: 'var(--font-head)',
    fontSize: 'clamp(42px, 6vw, 72px)',
    lineHeight: '1.0',
    letterSpacing: '0.02em',
  },
  heroSub: {
    fontSize: '16px',
    color: 'var(--text-muted)',
    lineHeight: '1.7',
    maxWidth: '440px',
  },
  trustRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '8px',
  },
  trustAvatars: {
    display: 'flex',
    alignItems: 'center',
  },
  trustAvatar: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #fff',
    position: 'relative',
  },
  heroRight: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  heroVisual: {
    border: '1px solid var(--border)',
    width: '100%',
    maxWidth: '420px',
    background: '#fff',
    overflow: 'hidden',
    boxShadow: '0 8px 30px rgba(115, 83, 246, 0.1)',
  },
  visualLabel: {
    padding: '10px 16px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border)',
    background: '#faf9ff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  liveDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--primary)',
    display: 'inline-block',
  },
  liveDotGreen: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--success)',
    display: 'inline-block',
  },
  visualScreen: {
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minHeight: '180px',
    alignItems: 'center',
    background: '#faf9ff',
  },
  faceBox: {
    width: '80px',
    height: '80px',
    border: '2px solid var(--primary)',
    borderRadius: '50%',
    background: 'var(--primary-light)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionCard: {
    border: '1px solid var(--border)',
    padding: '12px 14px',
    background: '#fff',
    width: '100%',
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
  },
  qDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--primary)',
    flexShrink: 0,
    marginTop: '4px',
  },
  statusRow: {
    padding: '10px 16px',
    borderTop: '1px solid var(--border)',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
  },
  linkBox: {
    marginTop: '24px',
    border: '1px solid var(--border)',
    background: '#fff',
    padding: '20px',
    textAlign: 'left',
    boxShadow: '0 4px 12px rgba(115, 83, 246, 0.06)',
  },
  section: {
    padding: '88px 0',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1px',
    background: 'var(--border)',
    border: '1px solid var(--border)',
  },
  featureCard: {
    padding: '36px 28px',
    background: '#fff',
    transition: 'background 0.3s ease',
  },
  featureIcon: {
    marginBottom: '16px',
    width: '48px',
    height: '48px',
    background: 'var(--primary-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1px 1fr',
    gap: '0',
    border: '1px solid var(--border)',
    background: '#fff',
  },
  compCol: {
    padding: '0',
  },
  compHeader: {
    padding: '16px 24px',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text-muted)',
    background: '#faf9ff',
  },
  compRow: {
    padding: '14px 24px',
    borderBottom: '1px solid var(--border)',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
  },
  footer: {
    borderTop: '1px solid var(--border)',
    padding: '24px 0',
    background: '#fff',
  },
}
