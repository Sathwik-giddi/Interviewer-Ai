import React from 'react'
import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'For candidates practicing',
    popular: false,
    features: [
      { text: '30 mock tests/month', ok: true },
      { text: 'Audio-only interviews', ok: true },
      { text: 'Basic on-screen report', ok: true },
      { text: 'English only', ok: true },
      { text: 'Video + audio', ok: false },
      { text: 'PDF report export', ok: false },
      { text: 'Live avatar', ok: false },
    ],
    cta: 'Start for Free',
    ctaStyle: 'outline',
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    description: 'Serious candidates',
    popular: false,
    features: [
      { text: 'Unlimited mock tests', ok: true },
      { text: 'Video + audio interviews', ok: true },
      { text: 'Full PDF report', ok: true },
      { text: '3 languages (EN, HI, TE)', ok: true },
      { text: 'Live avatar (male/female)', ok: true },
      { text: 'Priority queue', ok: true },
      { text: 'Early access to features', ok: true },
    ],
    cta: 'Go Pro',
    ctaStyle: 'outline',
  },
  {
    name: 'Business',
    price: '$399',
    period: '/mo',
    description: 'Growing teams (20–50)',
    popular: true,
    features: [
      { text: 'Unlimited campaigns', ok: true },
      { text: '500 candidates/month', ok: true },
      { text: 'Live HR intervention', ok: true },
      { text: 'Advanced analytics', ok: true },
      { text: 'Custom question banks', ok: true },
      { text: 'API access', ok: true },
      { text: 'Dedicated account manager', ok: true },
    ],
    cta: 'Get Started',
    ctaStyle: 'primary',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: '500+ members',
    popular: false,
    features: [
      { text: 'On-premise deployment', ok: true },
      { text: 'SSO / SAML', ok: true },
      { text: 'Custom TURN servers', ok: true },
      { text: 'Compliance reporting', ok: true },
      { text: '24/7 dedicated support', ok: true },
      { text: 'SLA guarantee', ok: true },
      { text: 'Custom integrations', ok: true },
    ],
    cta: 'Contact Sales',
    ctaStyle: 'primary',
  },
]

export default function PricingSection() {
  return (
    <div className="container mx-auto max-w-5xl px-4 sm:px-6">
      <div className="mb-12 text-center md:mb-16">
        <h2
          className="mb-3 text-3xl font-extrabold text-slate-900 sm:text-4xl"
          style={{ fontFamily: 'var(--font-head)' }}
        >
          Simple, transparent pricing
        </h2>
        <p className="mx-auto max-w-md text-base text-slate-500">
          No hidden fees. Start free, scale as you grow.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col rounded-2xl border bg-white p-6 transition-shadow hover:shadow-md ${
              plan.popular
                ? 'border-blue-600 shadow-lg shadow-blue-600/10'
                : 'border-slate-200'
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                Most Popular
              </span>
            )}
            <div className="mb-5">
              <h3
                className="text-lg font-bold text-slate-900"
                style={{ fontFamily: 'var(--font-head)' }}
              >
                {plan.name}
              </h3>
              <p className="text-xs text-slate-500">{plan.description}</p>
            </div>
            <div className="mb-6">
              <span
                className="text-3xl font-extrabold text-slate-900"
                style={{ fontFamily: 'var(--font-head)' }}
              >
                {plan.price}
              </span>
              {plan.period && (
                <span className="text-sm text-slate-500">{plan.period}</span>
              )}
            </div>
            <ul className="mb-8 flex-1 space-y-3">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  {f.ok ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                  )}
                  <span
                    className={`text-sm ${
                      f.ok ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {f.text}
                  </span>
                </li>
              ))}
            </ul>
            {plan.ctaStyle === 'primary' ? (
              plan.price === 'Custom' ? (
                <a
                  href="mailto:sales@canvue.ai"
                  className="inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700"
                >
                  {plan.cta}
                </a>
              ) : (
                <Link
                  to="/signup"
                  className="inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700"
                >
                  {plan.cta}
                </Link>
              )
            ) : (
              <Link
                to="/signup"
                className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                {plan.cta}
              </Link>
            )}
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-slate-500">
        Need a custom plan?{' '}
        <a
          href="mailto:sales@canvue.ai"
          className="font-semibold text-blue-600 underline transition hover:text-blue-700"
        >
          Contact Sales
        </a>
      </p>
    </div>
  )
}
