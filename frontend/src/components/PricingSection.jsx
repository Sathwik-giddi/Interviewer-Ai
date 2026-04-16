import React from 'react'
import { Link } from 'react-router-dom'

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Good for trying the product and running a few practice interviews.',
    features: [
      '3 interviews each month',
      'Resume-based setup',
      'Basic interview summary',
      'Email support',
    ],
    cta: 'Start free',
    ctaHref: '/signup',
  },
  {
    name: 'Pro',
    price: '$29/mo',
    description: 'For people or small teams who need more interviews and better reports.',
    features: [
      '25 interviews each month',
      'Detailed interview reports',
      'Coding round support',
      'Priority email support',
    ],
    cta: 'Choose Pro',
    ctaHref: '/signup',
  },
  {
    name: 'Business',
    price: '$99/mo',
    description: 'For hiring teams running interviews at higher volume.',
    features: [
      'Unlimited interviews',
      'Reviewer access for the team',
      'Custom role workflows',
      'Live recruiter takeover',
      'Analytics dashboard',
    ],
    cta: 'Start Business',
    ctaHref: '/signup',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For larger companies that need extra controls, reviews, and support.',
    features: [
      'SSO and access controls',
      'Custom integrations',
      'Dedicated onboarding',
      'Compliance support',
      'Priority SLA',
    ],
    cta: 'Talk to sales',
    ctaHref: 'mailto:sales@canvue.ai',
  },
]

export default function PricingSection() {
  return (
    <div className="container">
      <div className="landing-section-header">
        <span className="landing-eyebrow">Pricing</span>
        <h2>Plans that match how often you interview</h2>
        <p>
          Start small, then move up when you need more sessions, more reports,
          or more team access.
        </p>
      </div>

      <div className="pricing-grid">
        {plans.map((plan) => {
          const isMailto = plan.ctaHref.startsWith('mailto:')

          return (
            <article
              key={plan.name}
              className={`pricing-card${plan.popular ? ' pricing-card--popular' : ''}`}
            >
              {plan.popular && (
                <span className="pricing-card__badge">Most used</span>
              )}

              <div className="pricing-card__header">
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
              </div>

              <div className="pricing-card__price">
                <strong>{plan.price}</strong>
              </div>

              <ul className="pricing-card__features">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              {isMailto ? (
                <a href={plan.ctaHref} className="landing-btn landing-btn--secondary">
                  {plan.cta}
                </a>
              ) : (
                <Link
                  to={plan.ctaHref}
                  className={`landing-btn${
                    plan.popular ? ' landing-btn--primary' : ' landing-btn--secondary'
                  }`}
                >
                  {plan.cta}
                </Link>
              )}
            </article>
          )
        })}
      </div>

      <p className="pricing-footnote">
        Need security review, procurement help, or a custom rollout?
        <a href="mailto:sales@canvue.ai"> Talk to sales.</a>
      </p>
    </div>
  )
}
