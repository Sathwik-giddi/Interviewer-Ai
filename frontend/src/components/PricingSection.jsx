/**
 * PricingSection — Organization tiers + Candidate plans
 * Aether-styled cards with gradient accents
 */
import React, { useState } from 'react'
import { Link } from 'react-router-dom'

/* ── Icon helpers ── */
function Check() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}
function X() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function Star() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
}

/* ── Data ── */
const orgTiers = [
  { name: 'Solo', sub: '<10 members', price: 79.99, popular: false, features: ['2 campaigns', '50 candidates/month', 'AI evaluation', 'Basic analytics'] },
  { name: 'Small', sub: '10–20 members', price: 199, popular: false, features: ['10 campaigns', '200 candidates/month', 'Custom branding', 'Priority support'] },
  { name: 'Growing', sub: '20–50 members', price: 399, popular: true, features: ['25 campaigns', '500 candidates/month', 'Advanced analytics', 'API access'] },
  { name: 'Mid-Size', sub: '50–200 members', price: 799, popular: false, features: ['Unlimited campaigns', '2,000 candidates/month', 'Dedicated account manager', 'SSO & compliance'] },
  { name: 'Large', sub: '200–500 members', price: 1599, popular: false, features: ['SSO & SAML', 'Custom TURN servers', 'Compliance reporting', 'Custom integrations'] },
  { name: 'Enterprise', sub: '500+ members', price: null, popular: false, features: ['On-premise deployment', '24/7 dedicated support', 'SLA guarantee', 'Custom everything'] },
]

const candidatePlans = [
  { name: 'Free', price: 0, yearly: 0, features: [
    { text: '30 mock tests/month', ok: true },
    { text: 'Audio-only interviews', ok: true },
    { text: 'Basic on-screen report', ok: true },
    { text: 'English only', ok: true },
    { text: 'Video + audio', ok: false },
    { text: 'PDF report export', ok: false },
    { text: 'Live avatar', ok: false },
  ]},
  { name: 'Pro', price: 19, yearly: 190, features: [
    { text: 'Unlimited mock tests', ok: true },
    { text: 'Video + audio interviews', ok: true },
    { text: 'Full PDF report', ok: true },
    { text: '3 languages (EN, HI, TE)', ok: true },
    { text: 'Live avatar (male/female)', ok: true },
    { text: 'Priority queue', ok: true },
    { text: 'Early access to features', ok: true },
  ]},
]

export default function PricingSection() {
  const [yearly, setYearly] = useState(false)

  const cardBase = {
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '28px 24px',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
    position: 'relative',
  }

  const popularCard = {
    ...cardBase,
    border: '2px solid var(--primary)',
    boxShadow: '0 0 0 3px rgba(59,130,246,0.12), 0 8px 24px rgba(59,130,246,0.1)',
  }

  return (
    <section id="pricing" style={{ padding: '80px 0' }}>
      <div className="container" style={{ maxWidth: '1120px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, marginBottom: '12px' }}>
            Simple, transparent pricing
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '520px', margin: '0 auto' }}>
            No hidden fees. Start free, scale as you grow.
          </p>
        </div>

        {/* ══════ Organization Tiers ══════ */}
        <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '20px', fontWeight: 700, marginBottom: '24px', color: 'var(--text)' }}>
          🏢 For Organizations
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '64px' }}>
          {orgTiers.map(tier => (
            <div
              key={tier.name}
              style={tier.popular ? popularCard : cardBase}
              onMouseEnter={e => { if (!tier.popular) { e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.transform = 'translateY(-4px)' } }}
              onMouseLeave={e => { if (!tier.popular) { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' } }}
            >
              {tier.popular && (
                <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--gradient-primary)', color: '#fff', padding: '4px 16px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                  MOST POPULAR
                </span>
              )}
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{tier.name}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>{tier.sub}</p>
              <div style={{ marginBottom: '20px' }}>
                {tier.price != null ? (
                  <><span style={{ fontFamily: 'var(--font-head)', fontSize: '36px', fontWeight: 800, color: 'var(--text)' }}>${tier.price.toLocaleString()}</span><span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>/mo</span></>
                ) : (
                  <span style={{ fontFamily: 'var(--font-head)', fontSize: '28px', fontWeight: 800, color: 'var(--primary)' }}>Custom</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                {tier.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '14px', color: 'var(--text)' }}>
                    <Check /> {f}
                  </div>
                ))}
              </div>
              {tier.price != null ? (
                <Link to="/signup" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: '20px', borderRadius: '12px', padding: '12px' }}>Get Started</Link>
              ) : (
                <a href="mailto:sales@canvue.ai" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '20px', borderRadius: '12px', padding: '12px' }}>Contact Sales</a>
              )}
            </div>
          ))}
        </div>

        {/* ══════ Candidate Plans ══════ */}
        <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: 'var(--text)' }}>
          🎯 For Candidates
        </h3>
        {/* Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: yearly ? 'var(--text-muted)' : 'var(--text)' }}>Monthly</span>
          <button
            onClick={() => setYearly(!yearly)}
            style={{
              width: '48px', height: '26px', borderRadius: '9999px', border: 'none', cursor: 'pointer',
              background: yearly ? 'var(--primary)' : 'var(--border)',
              position: 'relative', transition: 'background 0.2s',
            }}
            aria-label="Toggle yearly pricing"
          >
            <span style={{
              position: 'absolute', top: '3px', left: yearly ? '25px' : '3px',
              width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }} />
          </button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: yearly ? 'var(--text)' : 'var(--text-muted)' }}>
            Yearly
          </span>
          {yearly && (
            <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700, border: '1px solid rgba(34,197,94,0.3)' }}>
              Save 17%
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          {candidatePlans.map(plan => (
            <div key={plan.name} style={{
              ...cardBase,
              ...(plan.name === 'Pro' ? { border: '2px solid var(--secondary)', boxShadow: '0 0 0 3px rgba(139,92,246,0.1), 0 8px 24px rgba(139,92,246,0.08)' } : {}),
            }}>
              {plan.name === 'Pro' && (
                <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--secondary)', color: '#fff', padding: '4px 16px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Star /> RECOMMENDED
                </span>
              )}
              <p style={{ fontFamily: 'var(--font-head)', fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>{plan.name}</p>
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontFamily: 'var(--font-head)', fontSize: '40px', fontWeight: 800, color: 'var(--text)' }}>
                  ${yearly ? Math.round(plan.yearly / 12) : plan.price}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>/mo</span>
                {yearly && plan.yearly > 0 && (
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    ${plan.yearly}/year billed annually
                  </span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '14px', color: f.ok ? 'var(--text)' : 'var(--text-muted)' }}>
                    {f.ok ? <Check /> : <X />} {f.text}
                  </div>
                ))}
              </div>
              <Link
                to="/signup"
                className={plan.name === 'Pro' ? 'btn btn-primary' : 'btn btn-outline'}
                style={{ width: '100%', justifyContent: 'center', marginTop: '20px', borderRadius: '12px', padding: '12px' }}
              >
                {plan.price === 0 ? 'Start for Free' : 'Go Pro'}
              </Link>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
          Need a custom plan? <a href="mailto:sales@canvue.ai" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>Contact Sales</a>
        </p>
      </div>
    </section>
  )
}