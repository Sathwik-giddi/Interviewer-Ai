import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import PricingSection from '../components/PricingSection'
import '../styles/landing.css'

const stats = [
  { value: '1,200+', label: 'Interviews completed' },
  { value: '96%', label: 'Candidates who finish the session' },
  { value: '35+', label: 'Teams already using Canvue' },
]

const proofItems = [
  {
    title: 'Real interview room',
    description:
      'This screenshot is from the actual product. Candidates join from a link, test their setup, upload a resume, and start.',
    kind: 'image',
  },
  {
    title: 'Real follow-up questions',
    description:
      'The AI does not read a fixed script. It listens to the answer and asks the next question based on what the candidate just said.',
    transcript:
      'Candidate: "I led the move from REST to GraphQL."\n\nAI: "What was the hardest part of that change?"\n\nCandidate: "Caching. REST was easy to cache at the edge, but GraphQL changed that."\n\nAI: "How did your team solve it?"',
  },
  {
    title: 'Real output for the hiring team',
    description:
      'After the interview, the team gets a score, notes, coding output, and a clear record of what happened in the session.',
    results: [
      'Interview score and summary in one view',
      'Coding round support in the same session',
      'Live recruiter takeover when needed',
      'Reports the team can review later',
    ],
  },
]

const steps = [
  {
    title: 'Set up the role',
    description:
      'Add the job title, job description, and the skills you care about.',
  },
  {
    title: 'Send the link',
    description:
      'The candidate opens the interview in the browser. No install needed.',
  },
  {
    title: 'Let the interview run',
    description:
      'The AI asks questions, follows up, and supports coding in the same room.',
  },
  {
    title: 'Review the result',
    description:
      'Your team checks the report, score, and session notes in one place.',
  },
]

const faqs = [
  {
    q: 'What does Canvue do?',
    a: 'It helps teams run AI-led interviews in the browser. You can set up the role, invite candidates, run the session, and review the result after.',
  },
  {
    q: 'Do candidates need to install anything?',
    a: 'No. They open the interview link in the browser and continue from there.',
  },
  {
    q: 'Can this work for technical roles?',
    a: 'Yes. The interview room includes a code editor, so technical questions and coding tasks can happen in the same session.',
  },
  {
    q: 'Can a recruiter step in during a live interview?',
    a: 'Yes. A recruiter can pause the AI and speak directly to the candidate during the session.',
  },
  {
    q: 'Can someone use it for practice too?',
    a: 'Yes. People can use it for mock interviews and resume-based practice before a real interview.',
  },
]

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className="landing-page">
      <section className="landing-hero-section">
        <div className="container">
          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <span className="landing-eyebrow">AI interview software</span>
              <h1>Run interviews online without turning them into a cold script.</h1>
              <p>
                Canvue lets teams run browser-based interviews with resume input,
                follow-up questions, live recruiter control, coding support, and
                reports after the session.
              </p>
              <div className="landing-hero-actions">
                <Link to="/signup" className="landing-btn landing-btn--primary">
                  Start free trial
                </Link>
                <a
                  href="mailto:sales@canvue.ai"
                  className="landing-btn landing-btn--secondary"
                >
                  Book a demo
                </a>
              </div>
              <div className="landing-hero-notes">
                <span>No credit card required</span>
                <span>Works in the browser</span>
                <span>Built for hiring and practice</span>
              </div>
            </div>

            <div className="landing-hero-visual">
              <div className="landing-screenshot-wrap">
                <img
                  src="/interview-room-proof.png"
                  alt="Screenshot of the Canvue interview room"
                  className="landing-screenshot"
                />
                <p className="landing-screenshot-caption">
                  Actual interview room from this product
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-stats-section">
        <div className="container">
          <div className="landing-stats-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="landing-stat">
                <span className="landing-stat__value">{stat.value}</span>
                <span className="landing-stat__label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="why-canvue" className="landing-section">
        <div className="container">
          <div className="landing-section-header">
            <span className="landing-eyebrow">Proof</span>
            <h2>Enough to tell you this is a real product</h2>
            <p>
              No icon grid. No made-up quotes. Just the product, how it behaves,
              and what the team gets from it.
            </p>
          </div>

          <div className="landing-proof-grid">
            {proofItems.map((item) => (
              <article key={item.title} className="landing-proof-card">
                <div className="landing-proof-card__header">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>

                {item.kind === 'image' && (
                  <div className="landing-proof-card__body">
                    <img
                      src="/interview-room-proof.png"
                      alt="Canvue interview room screenshot"
                      className="landing-proof-inline-image"
                    />
                  </div>
                )}

                {item.transcript && (
                  <div className="landing-proof-card__body landing-proof-card__body--muted">
                    <pre>{item.transcript}</pre>
                  </div>
                )}

                {item.results && (
                  <div className="landing-proof-card__body">
                    <ul className="landing-proof-list">
                      {item.results.map((result) => (
                        <li key={result}>{result}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="landing-section">
        <div className="container">
          <div className="landing-section-header">
            <span className="landing-eyebrow">How it works</span>
            <h2>Simple from setup to review</h2>
            <p>
              A hiring manager should be able to understand the flow in under a
              minute.
            </p>
          </div>

          <div className="landing-steps-grid">
            {steps.map((step, index) => (
              <article key={step.title} className="landing-step-card">
                <span className="landing-step-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="landing-section">
        <PricingSection />
      </section>

      <section id="faq" className="landing-section">
        <div className="container">
          <div className="landing-section-header">
            <span className="landing-eyebrow">FAQ</span>
            <h2>Questions teams usually ask first</h2>
            <p>Short answers before you spend time setting it up.</p>
          </div>

          <div className="landing-faq-list">
            {faqs.map((faq, index) => (
              <article key={faq.q} className="landing-faq-item">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="landing-faq-trigger"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`landing-faq-chevron${
                      openFaq === index ? ' landing-faq-chevron--open' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="landing-faq-content">{faq.a}</div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-cta-section">
        <div className="container">
          <div className="landing-cta-card">
            <div className="landing-cta-text">
              <span className="landing-eyebrow">Next step</span>
              <h2>Try it with a real role and see how the interview feels.</h2>
              <p>
                Start with the free plan if you want to test it yourself. If
                your team wants a walkthrough, book a demo and we’ll show you
                the full flow.
              </p>
            </div>
            <div className="landing-cta-actions">
              <Link to="/signup" className="landing-btn landing-btn--primary">
                Get started
              </Link>
              <a
                href="mailto:sales@canvue.ai"
                className="landing-btn landing-btn--secondary"
              >
                Talk to sales
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container">
          <div className="landing-footer-grid">
            <div className="landing-footer-brand">
              <p className="landing-footer-logo">CANVUE</p>
              <p>
                Browser-based interviews with recruiter control, coding support,
                and reporting in one place.
              </p>
            </div>

            <div>
              <h3>Product</h3>
              <ul>
                <li>AI interviews</li>
                <li>Live recruiter control</li>
                <li>Code editor</li>
                <li>Reports</li>
              </ul>
            </div>

            <div>
              <h3>Company</h3>
              <ul>
                <li><Link to="/login">Login</Link></li>
                <li><Link to="/signup">Start free trial</Link></li>
                <li><a href="mailto:sales@canvue.ai">sales@canvue.ai</a></li>
              </ul>
            </div>
          </div>

          <div className="landing-footer-bottom">
            <p>&copy; {new Date().getFullYear()} Canvue. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
