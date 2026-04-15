import React from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    eyebrow: 'Candidate practice',
    description: 'A strong starting point for mock interviews and resume feedback.',
    popular: false,
    features: [
      '30 mock tests each month',
      'Audio-led interview mode',
      'Basic on-screen report',
      'English interview flow',
    ],
    cta: 'Start for free',
    ctaStyle: 'outline',
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    eyebrow: 'Serious candidates',
    description: 'For candidates who want richer feedback, video, and full interview prep.',
    popular: false,
    features: [
      'Unlimited mock interviews',
      'Video and audio sessions',
      'Full PDF report export',
      'English, Hindi, and Telugu',
      'Live avatar voice options',
    ],
    cta: 'Go Pro',
    ctaStyle: 'outline',
  },
  {
    name: 'Business',
    price: '$399',
    period: '/mo',
    eyebrow: 'Growing hiring teams',
    description: 'Run campaigns, live intervention, and deeper reporting from one workflow.',
    popular: true,
    features: [
      'Unlimited campaigns',
      '500 candidate sessions per month',
      'Live HR intervention',
      'Advanced analytics and exports',
      'Custom question banks',
      'API access',
    ],
    cta: 'Get started',
    ctaStyle: 'primary',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    eyebrow: 'Complex environments',
    description: 'For larger organizations that need security, integration, and deployment control.',
    popular: false,
    features: [
      'SSO and SAML',
      'On-premise deployment options',
      'Custom TURN server support',
      'Compliance reporting',
      'Dedicated support and SLA',
      'Custom integrations',
    ],
    cta: 'Contact sales',
    ctaStyle: 'dark',
  },
]

export default function PricingSection() {
  return (
    <div className="container mx-auto max-w-6xl px-4 sm:px-6">
      <div className="landing-section-heading">
        <span className="landing-eyebrow-text">Pricing</span>
        <h2>Simple pricing</h2>
        <p>
          Start with the plan that fits you now. Move up when you need more
          interviews, more reports, or more team features.
        </p>
      </div>

      <div className="pricing-grid">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`pricing-card${plan.popular ? ' pricing-card--popular' : ''}`}
          >
            {plan.popular && (
              <span className="pricing-card__badge">Most popular</span>
            )}

            <div className="pricing-card__header">
              <span className="pricing-card__eyebrow">{plan.eyebrow}</span>
              <h3>{plan.name}</h3>
              <p>{plan.description}</p>
            </div>

            <div className="pricing-card__price">
              <strong>{plan.price}</strong>
              {plan.period && <span>{plan.period}</span>}
            </div>

            <ul className="pricing-card__features">
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Check className="h-4 w-4" />
                  {feature}
                </li>
              ))}
            </ul>

            {plan.ctaStyle === 'primary' && (
              <Link to="/signup" className="landing-btn landing-btn--primary">
                {plan.cta}
              </Link>
            )}

            {plan.ctaStyle === 'outline' && (
              <Link to="/signup" className="landing-btn landing-btn--secondary">
                {plan.cta}
              </Link>
            )}

            {plan.ctaStyle === 'dark' && (
              <a
                href="mailto:sales@canvue.ai"
                className="landing-btn landing-btn--secondary-dark"
              >
                {plan.cta}
              </a>
            )}
          </article>
        ))}
      </div>

      <p className="pricing-footnote">
        Need procurement support, custom security review, or deployment help?
        <a href="mailto:sales@canvue.ai"> Talk to sales.</a>
      </p>
    </div>
  )
}
