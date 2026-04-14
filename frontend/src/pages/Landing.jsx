/**
 * Landing — Canvue Home Page
 * Sections: Hero → Stats → Features → Testimonials → Pricing → FAQ → Footer
 * Aether theme: Plus Jakarta Sans headings, Inter body, blue+purple accents
 */
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PricingSection from '../components/PricingSection'

/* ── Icon components ── */
function IconMic() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
}
function IconGlobe() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
}
function IconCode() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
}
function IconRadio() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>
}
function IconShield() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
}
function IconFileSearch() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
}

function ChevronDown({ open }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}><polyline points="6 9 12 15 18 9"/></svg>
}

/* ── CountUp animation ── */
function AnimatedNumber({ target, suffix = '' }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const duration = 2000
    const step = Math.ceil(target / (duration / 16))
    const timer = setInterval(() => {
      start += step
      if (start >= target) { start = target; clearInterval(timer) }
      setCount(start)
    }, 16)
    return () => clearInterval(timer)
  }, [target])
  return <>{count.toLocaleString()}{suffix}</>
}

/* ── Feature data ── */
const features = [
  { icon: <IconMic />, title: 'Two-Way AI Interview', desc: 'Our AI asks natural follow-up questions, creating a conversation — not a quiz.' },
  { icon: <IconGlobe />, title: 'Multilingual Avatar', desc: 'Live AI interviewer with male/female voice options in English, Hindi, and Telugu.' },
  { icon: <IconCode />, title: 'Built-In Code Editor', desc: 'Candidates write and run code live. AI evaluates logic, syntax, and edge cases.' },
  { icon: <IconRadio />, title: 'Live HR Intervention', desc: 'HR can speak directly to candidates mid-interview via real-time audio bridge.' },
  { icon: <IconShield />, title: 'AI Proctoring', desc: 'Face tracking, tab-switch detection, and object alerts keep interviews fair.' },
  { icon: <IconFileSearch />, title: 'ATS Resume Parser', desc: 'Upload a resume, get an instant ATS score with skill matching and feedback.' },
]

/* ── Testimonials ── */
const testimonials = [
  { name: 'Sarah Chen', role: 'Tech Lead, Vercel', text: "Canvue's AI actually asked follow-up questions. It felt like a real conversation — not a scripted quiz.", initials: 'SC', color: '#3b82f6' },
  { name: 'Mike Rodriguez', role: 'HR Director, Stripe', text: 'The live HR intervention saved us from losing a great candidate. Game-changing feature.', initials: 'MR', color: '#8b5cf6' },
  { name: 'Priya Sharma', role: 'Candidate', text: 'I practiced 50+ mock interviews before my real one. The AI feedback was incredibly specific and helpful.', initials: 'PS', color: '#f59e0b' },
]

/* ── FAQ ── */
const faqs = [
  { q: 'Is Canvue GDPR compliant?', a: 'Yes. We follow strict data privacy regulations including GDPR and SOC 2. All data is encrypted at rest and in transit.' },
  { q: 'Can I try before buying?', a: 'Absolutely. Candidates get a free plan with 30 mock tests/month. Organizations get a 14-day free trial — no credit card required.' },
  { q: 'What languages are supported?', a: 'Currently English, Hindi, and Telugu. We\'re adding more languages every quarter. Request yours at hello@canvue.ai.' },
  { q: 'How does proctoring work?', a: 'Canvue uses AI-powered face tracking, tab-switch detection, and object recognition to ensure interview integrity — all in the browser, no downloads.' },
  { q: 'What\'s your refund policy?', a: '30-day money-back guarantee on all annual plans. Monthly plans can be cancelled anytime.' },
]

/* ── Styles ── */
const S = {
  section: { padding: '80px 0' },
  sectionAlt: { padding: '80px 0', background: 'var(--bg-subtle)' },
}

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      {/* ════════════════════════════════════════
          HERO
          ════════════════════════════════════════ */}
      <section style={{ padding: '100px 0 80px', background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle grid bg */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(59,130,246,0.06) 1px, transparent 0)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
        <div className="container" style={{ position: 'relative', textAlign: 'center', maxWidth: '800px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--primary-light)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '9999px', padding: '6px 16px', marginBottom: '24px', fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
            Now with live HR intervention
          </div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(36px,6vw,60px)', fontWeight: 800, lineHeight: 1.1, marginBottom: '20px', color: 'var(--text)' }}>
            Interview smarter<br />with <span className="gradient-text">Canvue AI</span>
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--text-muted)', maxWidth: '560px', margin: '0 auto 36px', lineHeight: 1.7 }}>
            Two-way AI interviews, live proctoring, multilingual avatars, and instant ATS scoring — all in one platform.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '16px', borderRadius: '12px', fontWeight: 700 }}>
              Start Free Trial
            </Link>
            <Link to="/signup" className="btn btn-outline" style={{ padding: '14px 32px', fontSize: '16px', borderRadius: '12px', fontWeight: 700 }}>
              Practice for Free
            </Link>
          </div>
          <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>No credit card required · Free candidate plan</p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          STATS
          ════════════════════════════════════════ */}
      <section style={S.section}>
        <div className="container" style={{ maxWidth: '900px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
            {[
              { num: 1500, suffix: '+', label: 'Interviews Conducted' },
              { num: 98, suffix: '%', label: 'Candidate Satisfaction' },
              { num: 40, suffix: '+', label: 'Companies Trust Canvue' },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '32px 20px', background: 'var(--bg-subtle)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'var(--font-head)', fontSize: '40px', fontWeight: 800, color: 'var(--primary)', display: 'block' }}>
                  <AnimatedNumber target={stat.num} suffix={stat.suffix} />
                </span>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '4px', display: 'block' }}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FEATURES
          ════════════════════════════════════════ */}
      <section style={S.sectionAlt}>
        <div className="container" style={{ maxWidth: '1000px' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, marginBottom: '12px' }}>
              Everything you need to hire smarter
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '480px', margin: '0 auto' }}>
              From AI-driven interviews to real-time proctoring — we've got it covered.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {features.map((f, i) => (
              <div key={i} style={{
                background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px 24px',
                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--primary)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <div style={{ width: '48px', height: '48px', background: 'var(--primary-light)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '16px' }}>
                  {f.icon}
                </div>
                <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '17px', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>{f.title}</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          TESTIMONIALS
          ════════════════════════════════════════ */}
      <section style={S.section}>
        <div className="container" style={{ maxWidth: '1000px' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, marginBottom: '12px' }}>
              Loved by HR teams & candidates
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>Here's what people are saying</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
                  {[1,2,3,4,5].map(s => <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>)}
                </div>
                <p style={{ fontSize: '15px', color: 'var(--text)', lineHeight: 1.7, marginBottom: '20px', fontStyle: 'italic' }}>
                  "{t.text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: t.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>
                    {t.initials}
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{t.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          PRICING
          ════════════════════════════════════════ */}
      <section style={S.sectionAlt}>
        <PricingSection />
      </section>

      {/* ════════════════════════════════════════
          FAQ
          ════════════════════════════════════════ */}
      <section style={S.section}>
        <div className="container" style={{ maxWidth: '720px' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, marginBottom: '12px' }}>
              Frequently asked questions
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>Everything you need to know about Canvue</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%', padding: '18px 20px', background: 'transparent', border: 'none',
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, color: 'var(--text)', textAlign: 'left',
                  }}
                >
                  {faq.q}
                  <ChevronDown open={openFaq === i} />
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 20px 18px', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CTA
          ════════════════════════════════════════ */}
      <section style={{ padding: '80px 0', background: 'var(--gradient-primary)', color: '#fff', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '600px' }}>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, marginBottom: '16px', color: '#fff' }}>
            Ready to transform your hiring?
          </h2>
          <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '32px', lineHeight: 1.7 }}>
            Join 40+ companies already using Canvue to conduct smarter, fairer interviews.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn" style={{ background: '#fff', color: 'var(--primary)', padding: '14px 32px', fontSize: '16px', borderRadius: '12px', fontWeight: 700, border: 'none' }}>
              Start Free Trial
            </Link>
            <a href="mailto:sales@canvue.ai" className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '14px 32px', fontSize: '16px', borderRadius: '12px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.3)' }}>
              Contact Sales
            </a>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FOOTER
          ════════════════════════════════════════ */}
      <footer style={{ padding: '48px 0 32px', background: 'var(--bg-subtle)', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px', marginBottom: '32px' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-head)', fontSize: '20px', fontWeight: 800, letterSpacing: '0.04em', marginBottom: '8px' }}>
                CAN<span style={{ color: 'var(--primary)' }}>VUE</span>
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                AI-powered interview platform for modern hiring teams.
              </p>
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Product</p>
              {['Features', 'Pricing', 'ATS Score', 'Mock Interviews'].map(l => (
                <p key={l}><Link to="/" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none' }}>{l}</Link></p>
              ))}
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Company</p>
              {['About', 'Blog', 'Careers', 'Contact'].map(l => (
                <p key={l}><a href="/" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none' }}>{l}</a></p>
              ))}
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Legal</p>
              {['Privacy Policy', 'Terms of Service', 'GDPR', 'Security'].map(l => (
                <p key={l}><a href="/" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none' }}>{l}</a></p>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              &copy; {new Date().getFullYear()} Canvue. All rights reserved.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              <a href="mailto:hello@canvue.ai" style={{ color: 'var(--primary)', textDecoration: 'none' }}>hello@canvue.ai</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}