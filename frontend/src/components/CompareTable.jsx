/**
 * CompareTable — Feature comparison across Canvue pricing plans
 * Adapted from shadcn compare-table.tsx to plain JSX + Tailwind
 */
import React from 'react'
import { Link } from 'react-router-dom'
import { Check, Minus, X } from 'lucide-react'
import { cn } from '../lib/utils'

// Plan definitions
const plans = [
  { name: 'Free', price: '$0', period: '', description: 'For candidates practicing', highlight: false },
  { name: 'Pro', price: '$19', period: '/mo', description: 'Serious candidates', highlight: false },
  { name: 'Business', price: '$399', period: '/mo', description: 'Growing teams (20–50)', highlight: true },
  { name: 'Enterprise', price: 'Custom', period: '', description: '500+ members', highlight: false },
]

// Feature groups
const featureGroups = [
  {
    title: 'Interview',
    features: [
      { name: 'Two-way AI interviews', values: [true, true, true, true] },
      { name: 'Mock interview limit', values: ['30/mo', 'Unlimited', 'Unlimited', 'Unlimited'] },
      { name: 'Multilingual avatar (EN/HI/TE)', values: [false, true, true, true] },
      { name: 'Live avatar (male/female)', values: [false, true, true, true] },
      { name: 'Built-in code editor', values: [true, true, true, true] },
      { name: 'Custom question banks', values: [false, false, true, true] },
    ],
  },
  {
    title: 'Live HR & Collaboration',
    features: [
      { name: 'Live HR intervention', values: [false, false, true, true] },
      { name: 'Two-way audio/video bridge', values: [false, false, true, true] },
      { name: 'HR custom questions (AI takeover)', values: [false, false, true, true] },
      { name: 'Real-time candidate monitoring', values: [false, false, true, true] },
    ],
  },
  {
    title: 'Proctoring & Integrity',
    features: [
      { name: 'Face tracking', values: [true, true, true, true] },
      { name: 'Gaze detection', values: [false, true, true, true] },
      { name: 'Tab-switch detection', values: [true, true, true, true] },
      { name: 'Object detection (phone, book)', values: [false, true, true, true] },
      { name: 'Proctoring alerts to HR', values: [false, false, true, true] },
    ],
  },
  {
    title: 'Reports & Analytics',
    features: [
      { name: 'On-screen report', values: [true, true, true, true] },
      { name: 'PDF report export', values: [false, true, true, true] },
      { name: 'ATS resume parsing', values: [false, true, true, true] },
      { name: 'Bulk resume zip upload', values: [false, false, true, true] },
      { name: 'Advanced analytics dashboard', values: [false, false, true, true] },
      { name: 'API access', values: [false, false, true, true] },
    ],
  },
  {
    title: 'Admin & Security',
    features: [
      { name: 'SSO / SAML', values: [false, false, false, true] },
      { name: 'Custom TURN servers', values: [false, false, false, true] },
      { name: 'Compliance reporting', values: [false, false, false, true] },
      { name: 'On-premise deployment', values: [false, false, false, true] },
      { name: 'Priority support', values: [false, true, true, true] },
      { name: 'Dedicated account manager', values: [false, false, true, true] },
      { name: '24/7 dedicated support', values: [false, false, false, true] },
      { name: 'SLA guarantee', values: [false, false, false, true] },
    ],
  },
]

function CellValue({ value }) {
  if (value === true) return <Check className="w-5 h-5 text-green-500 mx-auto" />
  if (value === false) return <X className="w-4 h-4 text-slate-300 mx-auto" />
  if (value === 'partial') return <Minus className="w-4 h-4 text-yellow-500 mx-auto" />
  return <span className="text-sm font-medium text-slate-700">{value}</span>
}

export default function CompareTable() {
  return (
    <section id="compare" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, marginBottom: '12px' }}>
            Compare plans & features
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '520px', margin: '0 auto' }}>
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>
        </div>

        {/* Table container — horizontally scrollable on mobile */}
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] border-collapse">
            {/* Plan header row */}
            <thead>
              <tr className="border-b border-gray-200">
                <th className="sticky left-0 z-10 bg-white text-left p-4 w-48 md:w-56 border-r border-gray-100">
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Features</span>
                </th>
                {plans.map((plan) => (
                  <th
                    key={plan.name}
                    className={cn(
                      'p-4 text-center w-36 md:w-44',
                      plan.highlight && 'bg-blue-50/60'
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {plan.highlight && (
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-3 py-0.5 rounded-full mb-1">
                          Most Popular
                        </span>
                      )}
                      <span className={cn('text-lg font-bold', plan.highlight ? 'text-blue-700' : 'text-slate-900')} style={{ fontFamily: 'var(--font-head)' }}>
                        {plan.name}
                      </span>
                      <span className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-head)' }}>
                        {plan.price}
                      </span>
                      {plan.period && <span className="text-sm text-slate-500">{plan.period}</span>}
                      <span className="text-xs text-slate-400 mt-1">{plan.description}</span>
                      <Link
                        to="/signup"
                        className={cn(
                          'mt-3 inline-block text-sm font-semibold px-5 py-2 rounded-xl transition-colors',
                          plan.highlight
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        )}
                      >
                        {plan.price === 'Custom' ? 'Contact Sales' : 'Get Started'}
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {featureGroups.map((group, gi) => (
                <React.Fragment key={group.title}>
                  {/* Group header row */}
                  <tr>
                    <td
                      colSpan={plans.length + 1}
                      className="bg-slate-50 px-4 py-3 border-y border-gray-100"
                    >
                      <span className="text-sm font-bold text-slate-700 uppercase tracking-wider" style={{ fontFamily: 'var(--font-head)' }}>
                        {group.title}
                      </span>
                    </td>
                  </tr>

                  {/* Feature rows */}
                  {group.features.map((feature, fi) => (
                    <tr
                      key={feature.name}
                      className={cn(
                        'border-b border-gray-50 hover:bg-slate-50/50 transition-colors',
                        fi % 2 === 0 && 'bg-white',
                        fi % 2 !== 0 && 'bg-gray-50/30'
                      )}
                    >
                      <td className="sticky left-0 z-10 bg-inherit px-4 py-3 text-sm text-slate-700 font-medium border-r border-gray-100 whitespace-nowrap">
                        {feature.name}
                      </td>
                      {feature.values.map((value, vi) => (
                        <td
                          key={vi}
                          className={cn(
                            'px-4 py-3 text-center',
                            plans[vi].highlight && 'bg-blue-50/30'
                          )}
                        >
                          <CellValue value={value} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom note */}
        <p className="text-center text-sm text-slate-500 mt-8">
          Need a custom plan?{' '}
          <a href="mailto:sales@canvue.ai" className="text-blue-600 font-semibold hover:underline">
            Contact Sales
          </a>
        </p>
      </div>
    </section>
  )
}