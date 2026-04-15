import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MessageCircle,
  Video,
  Globe,
  Code,
  Users,
  FileText,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Check,
  Zap,
  Shield,
  BarChart3,
} from 'lucide-react'
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

const partnerMarks = [
  'Northstar Talent',
  'Astra Health',
  'BluePeak Systems',
  'Meridian Ops',
  'ScaleForge',
  'Campus Loop',
]

const heroSignals = [
  {
    title: 'Conversational interviews',
    description:
      'Follow-up questions feel structured and human instead of robotic or one-way.',
  },
  {
    title: 'Interview integrity built in',
    description:
      'Proctoring, presence checks, and event tracking stay inside the browser flow.',
  },
  {
    title: 'Human control when needed',
    description:
      'Recruiters can step into a live session without breaking candidate momentum.',
  },
]

const stats = [
  {
    value: '1,500+',
    label: 'interviews orchestrated',
    detail:
      'Across hiring campaigns, candidate practice, and structured screening workflows.',
  },
  {
    value: '98%',
    label: 'candidate satisfaction',
    detail:
      'Driven by a calmer interview flow, clearer prompts, and better pacing.',
  },
  {
    value: '40+',
    label: 'teams onboarded',
    detail:
      'Used by recruiting teams, staffing partners, and interview preparation programs.',
  },
]

const pillars = [
  {
    icon: MessageCircle,
    title: 'A stronger candidate experience',
    description:
      'Candidates get a room that feels intentional, conversational, and credible from the first prompt onward.',
  },
  {
    icon: Shield,
    title: 'Clearer evidence for recruiters',
    description:
      'Every session carries transcript context, integrity signals, technical outputs, and a usable scorecard.',
  },
  {
    icon: BarChart3,
    title: 'A cleaner operating layer',
    description:
      'One product connects intake, interviewing, intervention, and reporting without tool sprawl.',
  },
]

const workflow = [
  {
    step: '01',
    icon: FileText,
    title: 'Load role and candidate context',
    description:
      'Start from the job brief, resume, and evaluation criteria so the interview is grounded before the session begins.',
  },
  {
    step: '02',
    icon: MessageCircle,
    title: 'Run a live AI interview',
    description:
      'The system adapts follow-ups in real time to test clarity, judgment, and depth instead of running a rigid script.',
  },
  {
    step: '03',
    icon: Video,
    title: 'Keep the interview trustworthy',
    description:
      'Browser-based proctoring and recruiter oversight protect integrity without adding friction for candidates.',
  },
  {
    step: '04',
    icon: BarChart3,
    title: 'Send decision-ready reports',
    description:
      'Teams finish each session with ATS context, transcripts, scorecards, and actionable next steps.',
  },
]

const features = [
  {
    icon: MessageCircle,
    title: 'Two-way AI interviews',
    description:
      'Run real conversations with layered follow-ups that test more than rehearsed answers.',
    points: ['Dynamic follow-ups', 'Natural pacing', 'Role-aware questioning'],
  },
  {
    icon: Shield,
    title: 'Live proctoring',
    description:
      'Keep face presence, tab events, and suspicious activity attached to the interview record.',
    points: ['Face tracking', 'Tab-switch alerts', 'Integrity summary'],
  },
  {
    icon: Globe,
    title: 'Multilingual avatars',
    description:
      'Support candidates with voice-led sessions in English, Hindi, and Telugu.',
    points: ['Voice-led flow', 'Multiple languages', 'Lower friction'],
  },
  {
    icon: Code,
    title: 'Technical evaluation in-session',
    description:
      'Candidates can write and run code without leaving the interview room.',
    points: ['Built-in editor', 'Execution ready', 'Structured evaluation'],
  },
  {
    icon: Users,
    title: 'Live HR intervention',
    description:
      'Recruiters can join at the right moment when nuance, rescue, or clarification matters.',
    points: ['Instant takeover', 'Higher save rate', 'Human handoff'],
  },
  {
    icon: FileText,
    title: 'ATS and interview intelligence',
    description:
      'Resume parsing, skill matching, and reports stay connected through the full workflow.',
    points: ['Resume parsing', 'Match scoring', 'Exportable reports'],
  },
]

const audiences = [
  {
    title: 'Hiring teams',
    description:
      'Standardize first-round interviews without reducing candidates to static form responses.',
  },
  {
    title: 'Candidate prep programs',
    description:
      'Offer realistic mock interviews and sharper feedback for students, job seekers, and cohorts.',
  },
  {
    title: 'Staffing teams',
    description:
      'Pre-qualify volume quickly and still hand clients stronger evidence than screening notes.',
  },
]

const testimonials = [
  {
    quote:
      "Canvue changed the tone of our screening process. Candidates stopped treating the first round like a machine and started engaging like it was a real interview.",
    name: 'Sarah Chen',
    role: 'HR Director, Northstar Talent',
    initials: 'SC',
  },
  {
    quote:
      'The live HR intervention feature has saved multiple high-intent candidates for us. It feels like the product was designed by people who understand hiring pressure.',
    name: 'Michael Torres',
    role: 'Head of Talent Ops, BluePeak Systems',
    initials: 'MT',
  },
  {
    quote:
      'I used it for mock interviews before my onsite rounds. The follow-up questions felt much more realistic than the usual practice tools.',
    name: 'Priya Sharma',
    role: 'Software Engineer',
    initials: 'PS',
  },
]

const faqs = [
  {
    q: 'How quickly can a team get started?',
    a: 'Most teams can launch the same day. Campaign setup, role context, and session creation are all designed to be lightweight.',
  },
  {
    q: 'Can recruiters step into a live interview?',
    a: 'Yes. Canvue supports live HR intervention through an in-session audio bridge, so your team can take over without restarting the session.',
  },
  {
    q: 'Does it support technical interviews?',
    a: 'Yes. The product includes a built-in code editor and lets teams combine conversational questioning with technical evaluation.',
  },
  {
    q: 'Do candidates need to install anything?',
    a: 'No. Interviews run in the browser with built-in media checks and integrity signals, which keeps onboarding simple.',
  },
  {
    q: 'Can candidates also use it for practice?',
    a: 'Yes. Candidate plans are built for mock interviews, prep loops, and ATS-focused resume feedback.',
  },
]

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <div className="landing-premium">
      <section className="landing-premium__hero">
        <div className="container">
          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <div className="landing-eyebrow">
                <Sparkles className="h-4 w-4" />
                AI interviewing with recruiter control
              </div>
              <h1 className="landing-hero-title">
                A premium interview platform for teams that want speed,
                structure, and trust.
              </h1>
              <p className="landing-hero-text">
                Canvue combines conversational AI interviews, live proctoring,
                recruiter intervention, multilingual avatars, and ATS-aligned
                reporting in one product built for modern hiring operations.
              </p>
              <div className="landing-hero-actions">
                <Link to="/signup" className="landing-btn landing-btn--primary">
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="mailto:sales@canvue.ai"
                  className="landing-btn landing-btn--secondary"
                >
                  Book a demo
                </a>
              </div>
              <p className="landing-hero-caption">
                No credit card required. Candidate practice plan included.
              </p>

              <div className="landing-hero-signal-grid">
                {heroSignals.map((signal) => (
                  <article key={signal.title} className="landing-signal-card">
                    <h3>{signal.title}</h3>
                    <p>{signal.description}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="landing-console">
              <div className="landing-console__frame">
                <div className="landing-console__topbar">
                  <div className="landing-console__traffic">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="landing-console__session">
                    Live interview room
                  </div>
                  <div className="landing-console__live">
                    <span className="landing-console__live-dot" />
                    HR ready
                  </div>
                </div>

                <div className="landing-console__body">
                  <div className="landing-console__candidate">
                    <div>
                      <p className="landing-console__label">Candidate</p>
                      <h3>Priya Sharma</h3>
                      <p className="landing-console__meta">
                        Backend Engineer candidate · Match score 92%
                      </p>
                    </div>
                    <div className="landing-console__badge">
                      Strong signal
                    </div>
                  </div>

                  <div className="landing-console__layout">
                    <div className="landing-console__panel landing-console__panel--feature">
                      <p className="landing-console__label">AI interviewer</p>
                      <h4>Depth increases when the answer is strong</h4>
                      <p className="landing-console__copy">
                        Instead of moving mechanically to the next question, the
                        interviewer pushes into tradeoffs, reasoning, and real
                        decision-making.
                      </p>
                      <div className="landing-console__transcript">
                        <span>AI</span>
                        Walk me through how you would protect a public API from
                        abuse while keeping latency low at scale.
                      </div>
                      <div className="landing-console__chips">
                        <span>Adaptive follow-up</span>
                        <span>Technical depth</span>
                        <span>Voice-led flow</span>
                      </div>
                    </div>

                    <div className="landing-console__stack">
                      <div className="landing-console__panel">
                        <p className="landing-console__label">Integrity status</p>
                        <div className="landing-console__metric-row">
                          <div>
                            <strong>99%</strong>
                            <span>Presence confidence</span>
                          </div>
                          <div>
                            <strong>1</strong>
                            <span>Tab change</span>
                          </div>
                          <div>
                            <strong>0</strong>
                            <span>Object alerts</span>
                          </div>
                        </div>
                      </div>

                      <div className="landing-console__panel">
                        <p className="landing-console__label">Scorecard snapshot</p>
                        <div className="landing-console__score">
                          <div className="landing-console__score-row">
                            <span>Communication</span>
                            <div className="landing-console__bar">
                              <i style={{ width: '91%' }} />
                            </div>
                          </div>
                          <div className="landing-console__score-row">
                            <span>System design</span>
                            <div className="landing-console__bar">
                              <i style={{ width: '88%' }} />
                            </div>
                          </div>
                          <div className="landing-console__score-row">
                            <span>Problem solving</span>
                            <div className="landing-console__bar">
                              <i style={{ width: '94%' }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="landing-console__panel">
                        <p className="landing-console__label">Recruiter actions</p>
                        <ul className="landing-console__actions">
                          <li>Join live audio</li>
                          <li>Tag candidate for fast-track review</li>
                          <li>Export ATS-ready summary</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="landing-logo-strip">
            <span className="landing-logo-strip__label">
              Used by teams building calmer, faster, and more credible interview
              workflows
            </span>
            <div className="landing-logo-strip__track">
              {partnerMarks.map((mark) => (
                <span key={mark} className="landing-logo-chip">
                  {mark}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="why-canvue" className="landing-premium__section">
        <div className="container">
          <SectionHeading
            eyebrow="Why teams switch"
            title="Designed to make the interview feel better on both sides"
            description="Canvue gives recruiting teams more control and better evidence while giving candidates a room that feels polished instead of automated."
          />

          <div className="landing-stat-grid">
            {stats.map((stat) => (
              <article key={stat.label} className="landing-stat-card">
                <span className="landing-stat-card__value">{stat.value}</span>
                <h3>{stat.label}</h3>
                <p>{stat.detail}</p>
              </article>
            ))}
          </div>

          <div className="landing-story-layout">
            <article className="landing-story-card landing-story-card--dark">
              <span className="landing-story-card__kicker">
                What makes the product land differently
              </span>
              <h3>
                The best interview software does more than automate. It protects
                tone, trust, and decision quality.
              </h3>
              <p>
                Canvue is built for teams that need throughput without making
                the first impression feel cold. The result is a product that
                looks premium to candidates and stays operationally useful for
                recruiters.
              </p>
              <ul className="landing-check-list">
                <li>
                  <Check className="h-4 w-4" />
                  One room for AI interviews, recruiter takeover, technical
                  evaluation, and reporting.
                </li>
                <li>
                  <Check className="h-4 w-4" />
                  Stronger structure for hiring teams without flattening the
                  human side of the interview.
                </li>
                <li>
                  <Check className="h-4 w-4" />
                  Better proof of skill, communication, and integrity attached
                  to every session.
                </li>
              </ul>
            </article>

            <div className="landing-pillar-grid">
              {pillars.map((pillar) => {
                const Icon = pillar.icon

                return (
                  <article key={pillar.title} className="landing-pillar-card">
                    <div className="landing-pillar-card__icon">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3>{pillar.title}</h3>
                    <p>{pillar.description}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="landing-premium__section landing-premium__section--warm">
        <div className="container">
          <SectionHeading
            eyebrow="How it works"
            title="A high-trust hiring flow from setup to decision"
            description="Every step is designed to reduce interviewer overhead while preserving stronger candidate context."
          />

          <div className="landing-timeline">
            {workflow.map((item) => {
              const Icon = item.icon

              return (
                <article key={item.step} className="landing-timeline-card">
                  <div className="landing-timeline-card__step">{item.step}</div>
                  <div className="landing-timeline-card__icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="landing-premium__section">
        <div className="container">
          <SectionHeading
            eyebrow="Capability stack"
            title="Everything the interview needs, presented in one clean product layer"
            description="The surface stays simple while the workflow underneath remains dense with signal, controls, and reporting depth."
          />

          <div className="landing-feature-grid">
            {features.map((feature) => {
              const Icon = feature.icon

              return (
                <article key={feature.title} className="landing-feature-card">
                  <div className="landing-feature-card__icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <ul>
                    {feature.points.map((point) => (
                      <li key={point}>
                        <Check className="h-4 w-4" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="landing-premium__section">
        <div className="container">
          <div className="landing-showcase">
            <div className="landing-showcase__copy">
              <SectionHeading
                eyebrow="Built for real-world hiring pressure"
                title="Run volume, protect quality, and still make the process feel high touch"
                description="Canvue works across campus hiring, technical screening, staffing workflows, and candidate practice because the room stays structured without feeling cold."
                align="left"
              />

              <div className="landing-audience-grid">
                {audiences.map((audience) => (
                  <article key={audience.title} className="landing-audience-card">
                    <h3>{audience.title}</h3>
                    <p>{audience.description}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="landing-command-card">
              <div className="landing-command-card__header">
                <div>
                  <span className="landing-command-card__eyebrow">
                    Hiring command center
                  </span>
                  <h3>One session, multiple layers of useful decision signal</h3>
                </div>
                <div className="landing-command-card__pulse">
                  <span />
                  Live
                </div>
              </div>

              <div className="landing-command-card__metrics">
                <article>
                  <strong>92%</strong>
                  <span>Role match</span>
                </article>
                <article>
                  <strong>14m</strong>
                  <span>Average screening time saved</span>
                </article>
                <article>
                  <strong>3x</strong>
                  <span>Faster reviewer handoff</span>
                </article>
              </div>

              <div className="landing-command-card__feed">
                <div>
                  <p>Interview insight</p>
                  <span>
                    Candidate showed strong tradeoff reasoning on caching,
                    latency, and queue backpressure.
                  </span>
                </div>
                <div>
                  <p>Integrity log</p>
                  <span>
                    Single tab-switch event detected. No additional anomalies
                    were recorded during the session.
                  </span>
                </div>
                <div>
                  <p>Recommended next step</p>
                  <span>
                    Advance to a technical panel and share the exported summary
                    with the hiring manager.
                  </span>
                </div>
              </div>

              <div className="landing-command-card__tags">
                <span>ATS-ready report</span>
                <span>Code output attached</span>
                <span>Transcript summary</span>
                <span>Intervention log</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-premium__section landing-premium__section--muted">
        <div className="container">
          <SectionHeading
            eyebrow="Social proof"
            title="Loved by recruiters, operators, and candidates who want the process to feel credible"
            description="Teams keep using Canvue because it reduces overhead without flattening the human side of interviewing."
          />

          <div className="landing-testimonial-grid">
            {testimonials.map((testimonial) => (
              <article
                key={testimonial.name}
                className="landing-testimonial-card"
              >
                <div className="landing-testimonial-card__stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <p className="landing-testimonial-card__quote">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="landing-testimonial-card__person">
                  <div className="landing-testimonial-card__avatar">
                    {testimonial.initials}
                  </div>
                  <div>
                    <h3>{testimonial.name}</h3>
                    <p>{testimonial.role}</p>
                  </div>
                </div>
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
            title="Answers for teams evaluating Canvue right now"
            description="The essentials on launch speed, interview formats, and what candidates need to join."
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

      <section className="landing-premium__cta">
        <div className="container">
          <div className="landing-cta-card">
            <div>
              <span className="landing-eyebrow-text">
                Ready to raise the standard?
              </span>
              <h2>Bring a calmer, stronger interview experience to your team.</h2>
              <p>
                Launch candidate practice, structured AI interviews, live
                recruiter intervention, and ATS-ready reporting from one premium
                workflow.
              </p>
            </div>

            <div className="landing-cta-card__actions">
              <Link to="/signup" className="landing-btn landing-btn--primary">
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:sales@canvue.ai"
                className="landing-btn landing-btn--secondary-dark"
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
              <div className="landing-footer__logo">
                <span className="landing-footer__logo-mark">
                  <Zap className="h-4 w-4" />
                </span>
                CANVUE
              </div>
              <p>
                AI-powered interviewing for teams that want speed, stronger
                signal, and a more credible candidate experience.
              </p>
            </div>

            <div>
              <h3>Platform</h3>
              <ul>
                <li>Conversational AI interviews</li>
                <li>Live proctoring</li>
                <li>Technical assessments</li>
                <li>ATS intelligence</li>
              </ul>
            </div>

            <div>
              <h3>Use Cases</h3>
              <ul>
                <li>Hiring teams</li>
                <li>Candidate practice</li>
                <li>Campus and cohort programs</li>
                <li>Staffing workflows</li>
              </ul>
            </div>

            <div>
              <h3>Get in touch</h3>
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
            <p>Browser-based interviewing with live recruiter control.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
