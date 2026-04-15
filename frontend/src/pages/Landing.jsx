import React, { useEffect, useState } from 'react'
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

function AnimatedNumber({ target, suffix = '' }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const duration = 2000
    const step = Math.ceil(target / (duration / 16))
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        start = target
        clearInterval(timer)
      }
      setCount(start)
    }, 16)

    return () => clearInterval(timer)
  }, [target])

  return (
    <>{count.toLocaleString()}{suffix}</>
  )
}

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
    title: 'Conversation-first interviewing',
    description:
      'Adaptive prompts, real follow-up questions, and a calmer candidate experience.',
  },
  {
    title: 'Integrity built into the room',
    description:
      'Video presence, tab events, and session alerts stay visible without extra installs.',
  },
  {
    title: 'Human takeover when it matters',
    description:
      'HR can step into the session live instead of losing a strong candidate to the flow.',
  },
]

const stats = [
  {
    num: 1500,
    suffix: '+',
    label: 'interviews orchestrated',
    detail:
      'Across live hiring, candidate practice, and structured screening workflows.',
  },
  {
    num: 98,
    suffix: '%',
    label: 'candidate satisfaction',
    detail:
      'Driven by conversational pacing, clearer prompts, and a less robotic experience.',
  },
  {
    num: 40,
    suffix: '+',
    label: 'teams already onboard',
    detail:
      'Used by recruiting teams, staffing partners, and candidate preparation programs.',
  },
]

const pillars = [
  {
    icon: MessageCircle,
    title: 'Candidates feel guided, not processed',
    description:
      'The interview behaves like a real conversation, so strong candidates can show depth instead of guessing how to game a static form.',
  },
  {
    icon: Shield,
    title: 'Recruiters get evidence instead of instincts',
    description:
      'Each session carries transcript highlights, integrity context, technical outputs, and a scorecard teams can actually act on.',
  },
  {
    icon: BarChart3,
    title: 'Hiring leaders get a cleaner operating layer',
    description:
      'One product handles intake, interviewing, intervention, and reporting without forcing teams into fragmented tools.',
  },
]

const workflow = [
  {
    step: '01',
    icon: FileText,
    title: 'Load role context',
    description:
      'Start with a job description, resume, and evaluation criteria so the interview is grounded before the session opens.',
  },
  {
    step: '02',
    icon: MessageCircle,
    title: 'Run a live AI conversation',
    description:
      'The interviewer adapts its follow-ups in real time, pushing deeper when a candidate shows confidence or clarity.',
  },
  {
    step: '03',
    icon: Video,
    title: 'Protect integrity without killing flow',
    description:
      'Keep browser-based proctoring, presence checks, and recruiter takeover available while the candidate stays in one room.',
  },
  {
    step: '04',
    icon: BarChart3,
    title: 'Ship scorecards immediately',
    description:
      'Export ATS insights, transcript summaries, and decision-ready reports as soon as the interview ends.',
  },
]

const features = [
  {
    icon: MessageCircle,
    title: 'Two-way AI interviews',
    description:
      'Move beyond one-way recordings. Canvue asks layered follow-up questions to test clarity, judgment, and real understanding.',
    points: ['Dynamic follow-ups', 'Natural pacing', 'Role-aware depth'],
  },
  {
    icon: Shield,
    title: 'Live proctoring',
    description:
      'Track face presence, tab switching, and suspicious events in the browser, then keep the full trail attached to the report.',
    points: ['Face tracking', 'Tab event alerts', 'Integrity summary'],
  },
  {
    icon: Globe,
    title: 'Multilingual avatars',
    description:
      'Give candidates a more inclusive interview room with voice-led interactions in English, Hindi, and Telugu.',
    points: ['Voice-led flow', 'Multiple languages', 'Calmer candidate UX'],
  },
  {
    icon: Code,
    title: 'Technical assessment inside the interview',
    description:
      'Candidates can write and run code without leaving the session while evaluators still receive a structured summary.',
    points: ['Built-in editor', 'Execution-ready', 'Logic and syntax review'],
  },
  {
    icon: Users,
    title: 'Live HR intervention',
    description:
      'When a session needs nuance, context, or rescue, recruiters can jump in with real-time audio instead of restarting the process.',
    points: ['Instant takeover', 'Higher save rate', 'Human where needed'],
  },
  {
    icon: FileText,
    title: 'ATS and interview intelligence',
    description:
      'Score resumes, align skills to roles, and carry that intelligence into the interview so the entire pipeline stays connected.',
    points: ['Resume parsing', 'Match scoring', 'Exportable reports'],
  },
]

const audiences = [
  {
    title: 'Hiring teams',
    description:
      'Standardize first-round screens without reducing candidates to rigid scripts or clumsy forms.',
  },
  {
    title: 'Candidate prep programs',
    description:
      'Offer polished mock interviews and sharper feedback for students, job seekers, and internal training cohorts.',
  },
  {
    title: 'Staffing and staffing-adjacent teams',
    description:
      'Pre-qualify volume quickly and still send clients richer evidence than notes from a rushed screening call.',
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
      'The live HR intervention feature has saved multiple high-intent candidates for us. That single capability makes the platform feel designed by people who understand hiring.',
    name: 'Michael Torres',
    role: 'Head of Talent Ops, BluePeak Systems',
    initials: 'MT',
  },
  {
    quote:
      'I used it for mock interviews before my onsite rounds. The follow-up questions were much more realistic than the usual practice tools and the feedback was specific.',
    name: 'Priya Sharma',
    role: 'Software Engineer',
    initials: 'PS',
  },
]

const faqs = [
  {
    q: 'How quickly can a team get started?',
    a: 'Most teams can launch the same day. You can create campaigns, upload role context, and start running interviews without additional downloads or desktop software.',
  },
  {
    q: 'Can recruiters really step into a live interview?',
    a: 'Yes. Canvue supports live HR intervention through an in-session audio bridge, so your team can take over when a candidate needs clarification or when a strong conversation deserves a human handoff.',
  },
  {
    q: 'Does it support technical or coding interviews?',
    a: 'Yes. The platform includes a built-in code editor and lets teams combine conversational questioning with live coding tasks and structured evaluation.',
  },
  {
    q: 'Do candidates need to install anything?',
    a: 'No. Interviews run in the browser with built-in proctoring and media checks, which keeps onboarding friction low for both candidates and recruiters.',
  },
  {
    q: 'Can candidates use Canvue for practice too?',
    a: 'Yes. The candidate plans are designed for mock interviews, interview prep, and ATS-focused resume feedback before a real hiring process begins.',
  },
]

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(0)

  useEffect(() => {
    const elements = document.querySelectorAll('.landing-reveal')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="landing-premium">
      <section className="landing-premium__hero">
        <div className="landing-premium__mesh" />
        <div className="landing-premium__glow landing-premium__glow--left" />
        <div className="landing-premium__glow landing-premium__glow--right" />
        <div className="landing-premium__beam landing-premium__beam--one" />
        <div className="landing-premium__beam landing-premium__beam--two" />
        <div className="container">
          <div className="landing-hero-grid">
            <div className="landing-hero-copy landing-reveal is-visible">
              <div className="landing-eyebrow landing-eyebrow--animated">
                <Sparkles className="h-4 w-4" />
                Live AI interviews with human control
              </div>
              <h1 className="landing-hero-title">
                The interview platform that feels premium to candidates and
                precise to hiring teams.
              </h1>
              <p className="landing-hero-text">
                Canvue combines conversational AI, live proctoring,
                multilingual avatars, recruiter takeover, and ATS intelligence
                in one polished interview room.
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
                  Book a team demo
                </a>
              </div>
              <p className="landing-hero-caption">
                No credit card required. Free candidate plan available.
              </p>

              <div className="landing-hero-signal-grid">
                {heroSignals.map((signal, index) => (
                  <article
                    key={signal.title}
                    className="landing-signal-card landing-reveal is-visible"
                    style={{ '--delay': `${0.14 + index * 0.08}s` }}
                  >
                    <h3>{signal.title}</h3>
                    <p>{signal.description}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="landing-console landing-reveal is-visible" style={{ '--delay': '0.18s' }}>
              <div className="landing-console__float landing-console__float--left">
                <span>Candidate calm score</span>
                <strong>+32%</strong>
              </div>
              <div className="landing-console__float landing-console__float--right">
                <span>Recruiter control</span>
                <strong>Live handoff</strong>
              </div>
              <div className="landing-console__frame landing-console__frame--animated">
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
                      <h4>Follow-up depth increased after a strong API answer</h4>
                      <p className="landing-console__copy">
                        The interviewer is pushing into system design tradeoffs,
                        scaling concerns, and failure handling instead of moving
                        to the next scripted question.
                      </p>
                      <div className="landing-console__transcript">
                        <span>AI</span>
                        Walk me through how you would prevent abuse on a public
                        rate-limited endpoint while keeping latency low.
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
                        <p className="landing-console__label">
                          Scorecard snapshot
                        </p>
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
                        <p className="landing-console__label">
                          Recruiter actions
                        </p>
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

          <div className="landing-logo-strip landing-reveal" style={{ '--delay': '0.1s' }}>
            <span className="landing-logo-strip__label">
              Used by teams building calmer, faster, more credible interview
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
          <div className="landing-reveal">
            <SectionHeading
              eyebrow="Why teams switch"
              title="Designed to make the interview feel better on both sides"
              description="Canvue gives recruiting teams more control and better evidence while giving candidates a room that feels thoughtful instead of automated."
            />
          </div>

          <div className="landing-stat-grid">
            {stats.map((stat, index) => (
              <article
                key={stat.label}
                className="landing-stat-card landing-reveal"
                style={{ '--delay': `${index * 0.08}s` }}
              >
                <span className="landing-stat-card__value">
                  <AnimatedNumber target={stat.num} suffix={stat.suffix} />
                </span>
                <h3>{stat.label}</h3>
                <p>{stat.detail}</p>
              </article>
            ))}
          </div>

          <div className="landing-story-layout">
            <article className="landing-story-card landing-story-card--dark landing-reveal">
              <span className="landing-story-card__kicker">
                What makes the product land differently
              </span>
              <h3>
                Most interview products optimize for throughput. The best ones
                also protect tone, trust, and signal quality.
              </h3>
              <p>
                Canvue is built around a simple premise: speed is only useful
                if the interview still feels credible. That means a calm
                candidate experience, a strong recruiter control layer, and a
                report that helps the next decision happen faster.
              </p>
              <ul className="landing-check-list">
                <li>
                  <Check className="h-4 w-4" />
                  One room for AI interviewing, live intervention, technical
                  evaluation, and reporting.
                </li>
                <li>
                  <Check className="h-4 w-4" />
                  Structure for hiring teams without turning the experience into
                  a robotic script.
                </li>
                <li>
                  <Check className="h-4 w-4" />
                  Clear proof of skill, communication, and integrity attached to
                  every session.
                </li>
              </ul>
            </article>

            <div className="landing-pillar-grid">
              {pillars.map((pillar, index) => {
                const Icon = pillar.icon

                return (
                  <article
                    key={pillar.title}
                    className="landing-pillar-card landing-reveal"
                    style={{ '--delay': `${0.08 + index * 0.08}s` }}
                  >
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
          <div className="landing-reveal">
            <SectionHeading
              eyebrow="How it works"
              title="A four-step hiring flow that stays tight from setup to decision"
              description="Every part of the process is designed to reduce interviewer overhead while preserving stronger candidate context."
            />
          </div>

          <div className="landing-timeline">
            {workflow.map((item, index) => {
              const Icon = item.icon

              return (
                <article
                  key={item.step}
                  className="landing-timeline-card landing-reveal"
                  style={{ '--delay': `${index * 0.08}s` }}
                >
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
          <div className="landing-reveal">
            <SectionHeading
              eyebrow="Capability stack"
              title="Everything the interview needs, without making the page feel overloaded"
              description="The product surface stays clean while the workflow underneath remains dense with signal, controls, and reporting depth."
            />
          </div>

          <div className="landing-feature-grid">
            {features.map((feature, index) => {
              const Icon = feature.icon

              return (
                <article
                  key={feature.title}
                  className="landing-feature-card landing-reveal"
                  style={{ '--delay': `${index * 0.06}s` }}
                >
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
            <div className="landing-showcase__copy landing-reveal">
              <SectionHeading
                eyebrow="Built for real-world hiring pressure"
                title="Run volume, protect quality, and still make the experience feel high touch"
                description="Canvue works across campus hiring, technical screening, high-volume qualification, and candidate practice because the room is structured without feeling cold."
                align="left"
              />

              <div className="landing-audience-grid">
                {audiences.map((audience, index) => (
                  <article
                    key={audience.title}
                    className="landing-audience-card landing-reveal"
                    style={{ '--delay': `${0.08 + index * 0.08}s` }}
                  >
                    <h3>{audience.title}</h3>
                    <p>{audience.description}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="landing-command-card landing-reveal" style={{ '--delay': '0.12s' }}>
              <div className="landing-command-card__header">
                <div>
                  <span className="landing-command-card__eyebrow">
                    Hiring command center
                  </span>
                  <h3>One session, multiple layers of decision signal</h3>
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
                  <span>Avg. screen time saved</span>
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
                    Candidate gave strong tradeoff reasoning on caching,
                    latency, and queue backpressure.
                  </span>
                </div>
                <div>
                  <p>Integrity log</p>
                  <span>
                    Single tab-switch event detected. No additional anomalies
                    recorded during the session.
                  </span>
                </div>
                <div>
                  <p>Recommended next step</p>
                  <span>
                    Advance to technical panel and share the exported session
                    summary with the hiring manager.
                  </span>
                </div>
              </div>

              <div className="landing-command-card__tags">
                <span>ATS-ready report</span>
                <span>Code output attached</span>
                <span>Transcript summary</span>
                <span>Human intervention log</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-premium__section landing-premium__section--muted">
        <div className="container">
          <div className="landing-reveal">
            <SectionHeading
              eyebrow="Social proof"
              title="Loved by recruiters, operators, and candidates who want the process to feel credible"
              description="Teams keep using Canvue because it reduces overhead without flattening the human side of interviewing."
            />
          </div>

          <div className="landing-testimonial-grid">
            {testimonials.map((testimonial, index) => (
              <article
                key={testimonial.name}
                className="landing-testimonial-card landing-reveal"
                style={{ '--delay': `${index * 0.08}s` }}
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

      <section id="pricing" className="landing-premium__section landing-reveal">
        <PricingSection />
      </section>

      <section id="faq" className="landing-premium__section">
        <div className="container">
          <div className="landing-reveal">
            <SectionHeading
              eyebrow="FAQ"
              title="Answers for teams evaluating Canvue right now"
              description="The essentials on launch speed, interview formats, and what candidates need to join."
            />
          </div>

          <div className="landing-faq-list">
            {faqs.map((faq, index) => (
              <article
                key={faq.q}
                className="landing-faq-card landing-reveal"
                style={{ '--delay': `${index * 0.05}s` }}
              >
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
          <div className="landing-cta-card landing-reveal">
            <div>
              <span className="landing-eyebrow-text">
                Ready to raise the standard?
              </span>
              <h2>Bring a more premium interview experience to your team.</h2>
              <p>
                Launch candidate practice, structured AI interviews, live
                recruiter intervention, and ATS-ready reporting from one product.
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
              <h3>Use cases</h3>
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
