import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import PricingSection from '../components/PricingSection'
import '../styles/landing.css'

function SectionHeading({ eyebrow, title, description, align = 'center' }) {
  return (
    <div
      className={`landing-section-heading${
        align === 'left' ? ' landing-section-heading--left' : ''
      }`}
    >
      <span className="landing-eyebrow-text">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}

const proofFacts = [
  {
    title: 'This is the real product',
    description:
      'The screenshot below is from the actual interview room in this app, not a made-up dashboard.',
  },
  {
    title: 'Candidates join in the browser',
    description:
      'They can add their details, upload a resume, and start without installing anything.',
  },
  {
    title: 'Code and voice happen in one place',
    description:
      'The same interview room supports typed answers, live code tasks, and voice-based questions.',
  },
  {
    title: 'Recruiters keep control',
    description:
      'The product includes proctoring, session tracking, and a way for HR to step in when needed.',
  },
]

const steps = [
  {
    title: 'Set up the role',
    description:
      'Add the job title, job description, and any hiring context you want the interview to use.',
  },
  {
    title: 'Invite the candidate',
    description:
      'Send the interview link. The candidate opens it in the browser and starts from the setup screen.',
  },
  {
    title: 'Run the interview',
    description:
      'The system asks follow-up questions, records the session, and keeps track of basic integrity checks.',
  },
  {
    title: 'Review the result',
    description:
      'After the session, your team can review the answers, score, and notes in one place.',
  },
]

const uses = [
  {
    title: 'First-round hiring screens',
    description:
      'Useful when your team wants a consistent first step before a live panel or hiring manager round.',
  },
  {
    title: 'Candidate practice',
    description:
      'Candidates can use the same product for mock interviews and resume-based prep.',
  },
  {
    title: 'Technical interviews',
    description:
      'The product supports coding tasks inside the interview instead of sending people to a separate tool.',
  },
  {
    title: 'High-volume review',
    description:
      'Teams can use it to handle more candidates without turning the process into a form or a one-way video.',
  },
]

const faqs = [
  {
    q: 'What does Canvue do?',
    a: 'It helps teams run AI-led interviews in the browser. It covers interview setup, candidate flow, live monitoring, coding tasks, and reporting.',
  },
  {
    q: 'Do candidates need to install anything?',
    a: 'No. They open the interview link in the browser and continue from there.',
  },
  {
    q: 'Can this be used for technical roles?',
    a: 'Yes. The interview room includes a code editor, so technical questions and live coding can happen in the same session.',
  },
  {
    q: 'Can a recruiter step in during a live session?',
    a: 'Yes. The product supports live HR intervention when a recruiter needs to join the conversation.',
  },
  {
    q: 'Can people use it for practice too?',
    a: 'Yes. Candidates can use it for mock interviews and resume-based practice before real interviews.',
  },
]

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <div className="landing-premium">
      <section className="landing-premium__hero">
        <div className="container">
          <div className="landing-hero">
            <div className="landing-hero__copy">
              <span className="landing-kicker">
                AI interview platform
              </span>
              <h1>
                Run better interviews without making the process feel cold.
              </h1>
              <p>
                Canvue helps teams run browser-based interviews with resume
                input, follow-up questions, coding support, live recruiter
                control, and reports after the session.
              </p>
              <div className="landing-hero__actions">
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
              <div className="landing-hero__notes">
                <span>No credit card required</span>
                <span>Browser based</span>
                <span>Works for hiring and practice</span>
              </div>
            </div>

            <div className="landing-hero__summary">
              <div className="landing-summary-card">
                <h2>What you can do with it</h2>
                <ul>
                  <li>Run AI-led interviews with follow-up questions</li>
                  <li>Upload resumes and job details before the session starts</li>
                  <li>Use one room for voice, text, and coding</li>
                  <li>Review reports after the interview ends</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="why-canvue" className="landing-premium__section">
        <div className="container">
          <SectionHeading
            eyebrow="Proof"
            title="What the product actually looks like"
            description="This section uses a real screenshot from the app so people can see the product instead of reading generic marketing claims."
          />

          <div className="landing-proof">
            <div className="landing-proof__image-wrap">
              <img
                src="/interview-room-proof.png"
                alt="Real screenshot of the Canvue interview room setup screen"
                className="landing-proof__image"
              />
              <p className="landing-proof__caption">
                Real screenshot from the interview room setup screen in this
                app.
              </p>
            </div>

            <div className="landing-proof__content">
              {proofFacts.map((fact) => (
                <article key={fact.title} className="landing-proof__item">
                  <h3>{fact.title}</h3>
                  <p>{fact.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="landing-premium__section">
        <div className="container">
          <SectionHeading
            eyebrow="How it works"
            title="Simple flow for teams and candidates"
            description="The page is simple because the product should be easy to understand in under a minute."
          />

          <div className="landing-steps">
            {steps.map((step, index) => (
              <article key={step.title} className="landing-step">
                <span className="landing-step__number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-premium__section">
        <div className="container">
          <SectionHeading
            eyebrow="Use cases"
            title="Where teams use it"
            description="These are practical ways the product can fit into a real hiring process."
          />

          <div className="landing-uses">
            {uses.map((item) => (
              <article key={item.title} className="landing-use">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="landing-premium__section">
        <PricingSection />
      </section>

      <section id="faq" className="landing-premium__section">
        <div className="container">
          <SectionHeading
            eyebrow="FAQ"
            title="Questions people usually ask"
            description="Short answers to the things most teams want to know before trying the product."
          />

          <div className="landing-faq-list">
            {faqs.map((faq, index) => (
              <article key={faq.q} className="landing-faq-card">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="landing-faq-card__trigger"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="landing-faq-card__content">{faq.a}</div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-premium__section landing-premium__section--cta">
        <div className="container">
          <div className="landing-cta">
            <div>
              <span className="landing-eyebrow-text">Next step</span>
              <h2>Try the product and see how the flow feels.</h2>
              <p>
                If you want a first look, start with the free plan. If you want
                a walkthrough for your team, book a demo.
              </p>
            </div>

            <div className="landing-cta__actions">
              <Link to="/signup" className="landing-btn landing-btn--primary">
                Start free trial
              </Link>
              <a
                href="mailto:sales@canvue.ai"
                className="landing-btn landing-btn--secondary"
              >
                Contact sales
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container">
          <div className="landing-footer__grid">
            <div className="landing-footer__brand">
              <p className="landing-footer__logo">CANVUE</p>
              <p>
                Browser-based interviews with recruiter control, coding support,
                and reporting in one place.
              </p>
            </div>

            <div>
              <h3>Product</h3>
              <ul>
                <li>AI interviews</li>
                <li>Live proctoring</li>
                <li>Code editor</li>
                <li>Reports</li>
              </ul>
            </div>

            <div>
              <h3>Use</h3>
              <ul>
                <li>Hiring teams</li>
                <li>Candidate practice</li>
                <li>Technical screens</li>
                <li>Interview prep</li>
              </ul>
            </div>

            <div>
              <h3>Contact</h3>
              <ul>
                <li><Link to="/login">Login</Link></li>
                <li><Link to="/signup">Start free trial</Link></li>
                <li><a href="mailto:sales@canvue.ai">sales@canvue.ai</a></li>
                <li><a href="mailto:hello@canvue.ai">hello@canvue.ai</a></li>
              </ul>
            </div>
          </div>

          <div className="landing-footer__bottom">
            <p>&copy; {new Date().getFullYear()} Canvue. All rights reserved.</p>
            <p>Built for real interviews, not just demos.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
