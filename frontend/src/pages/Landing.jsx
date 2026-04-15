import React, { useState, useEffect } from 'react'
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

const features = [
  { icon: MessageCircle, title: 'Two-Way AI Interview', desc: 'Our AI asks natural follow-up questions, creating a conversation — not a quiz.' },
  { icon: Video, title: 'Live Proctoring', desc: 'Face tracking, tab-switch detection, and object alerts keep interviews fair and secure.' },
  { icon: Globe, title: 'Multilingual Avatar', desc: 'Live AI interviewer with male/female voice options in English, Hindi, and Telugu.' },
  { icon: Code, title: 'Built-In Code Editor', desc: 'Candidates write and run code live. AI evaluates logic, syntax, and edge cases.' },
  { icon: Users, title: 'Live HR Intervention', desc: 'HR can speak directly to candidates mid-interview via real-time audio bridge.' },
  { icon: FileText, title: 'ATS Resume Parser', desc: 'Upload a resume, get an instant ATS score with skill matching and feedback.' },
]

const testimonials = [
  {
    quote: "Canvue's AI actually asked follow-up questions. It felt like a real conversation — not a scripted quiz.",
    name: 'Sarah Chen',
    role: 'HR Director, TechCorp',
    initials: 'SC',
    color: 'bg-blue-600',
  },
  {
    quote: 'The live HR intervention saved us from losing a great candidate. Game-changing feature for our hiring pipeline.',
    name: 'Michael Torres',
    role: 'CTO, ScaleUp Inc.',
    initials: 'MT',
    color: 'bg-violet-600',
  },
  {
    quote: 'I practiced 50+ mock interviews before my real one. The AI feedback was incredibly specific and helpful.',
    name: 'Priya Sharma',
    role: 'Software Engineer',
    initials: 'PS',
    color: 'bg-amber-500',
  },
]

const faqs = [
  {
    q: 'What is Canvue?',
    a: 'Canvue is an AI-powered interview platform that conducts two-way conversational interviews with candidates, complete with live proctoring, multilingual avatars, code editor, and instant ATS scoring.',
  },
  {
    q: 'How does proctoring work?',
    a: 'Canvue uses AI-powered face tracking, tab-switch detection, and object recognition to ensure interview integrity — all in the browser, no downloads required.',
  },
  {
    q: 'Can I switch plans anytime?',
    a: 'Yes. You can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle. No long-term contracts.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Absolutely. Candidates get a free plan with 30 mock tests/month. Organizations get a 14-day free trial — no credit card required.',
  },
]

const stats = [
  { num: 1500, suffix: '+', label: 'Interviews Completed' },
  { num: 98, suffix: '%', label: 'Candidate Satisfaction' },
  { num: 40, suffix: '+', label: 'Companies Trust Canvue' },
]

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className="min-h-screen bg-white">
      {/* HERO */}
      <section className="relative overflow-hidden pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="container relative mx-auto px-4 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">
              <Sparkles className="h-4 w-4" />
              Now with live HR intervention
            </div>
            <h1
              className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl"
              style={{ fontFamily: 'var(--font-head)' }}
            >
              Interview smarter
              <br />
              with{' '}
              <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                Canvue AI
              </span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-500 md:text-xl">
              Two-way AI interviews, live proctoring, multilingual avatars, and
              instant ATS scoring — all in one platform.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                Practice for Free
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              No credit card required &middot; Free candidate plan
            </p>
          </div>

          {/* Abstract illustration placeholder */}
          <div className="mx-auto mt-16 max-w-3xl">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-8 shadow-lg">
              <div className="flex items-center justify-center gap-6 py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                  <MessageCircle className="h-8 w-8" />
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md">
                  <Zap className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                  <Video className="h-8 w-8" />
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md">
                  <Shield className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <BarChart3 className="h-8 w-8" />
                </div>
              </div>
              <div className="mx-auto max-w-sm space-y-3">
                <div className="h-3 w-3/4 rounded-full bg-slate-200" />
                <div className="h-3 w-full rounded-full bg-blue-100" />
                <div className="h-3 w-5/6 rounded-full bg-slate-100" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="border-y border-slate-100 bg-slate-50/50 py-14">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm"
              >
                <span
                  className="block text-4xl font-extrabold text-blue-600"
                  style={{ fontFamily: 'var(--font-head)' }}
                >
                  <AnimatedNumber target={stat.num} suffix={stat.suffix} />
                </span>
                <span className="mt-1 block text-sm font-medium text-slate-500">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="bg-slate-50 py-20 md:py-28">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-12 text-center md:mb-16">
            <h2
              className="mb-3 text-3xl font-extrabold text-slate-900 sm:text-4xl"
              style={{ fontFamily: 'var(--font-head)' }}
            >
              Everything you need to hire smarter
            </h2>
            <p className="mx-auto max-w-md text-base text-slate-500">
              From AI-driven interviews to real-time proctoring — we've got it
              covered.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <div
                  key={i}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3
                    className="mb-2 text-base font-bold text-slate-900"
                    style={{ fontFamily: 'var(--font-head)' }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-500">
                    {f.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-12 text-center md:mb-16">
            <h2
              className="mb-3 text-3xl font-extrabold text-slate-900 sm:text-4xl"
              style={{ fontFamily: 'var(--font-head)' }}
            >
              Loved by HR teams & candidates
            </h2>
            <p className="text-base text-slate-500">
              Here's what people are saying
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="mb-4 flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg
                      key={s}
                      className="h-4 w-4 text-amber-400"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <p className="mb-5 text-sm leading-relaxed text-slate-600 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${t.color}`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {t.name}
                    </p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-slate-50 py-20 md:py-28">
        <PricingSection />
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto max-w-2xl px-4 sm:px-6">
          <div className="mb-12 text-center md:mb-16">
            <h2
              className="mb-3 text-3xl font-extrabold text-slate-900 sm:text-4xl"
              style={{ fontFamily: 'var(--font-head)' }}
            >
              Frequently asked questions
            </h2>
            <p className="text-base text-slate-500">
              Everything you need to know about Canvue
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  {faq.q}
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                      openFaq === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-500">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-violet-600 py-20 text-center text-white md:py-28">
        <div className="container mx-auto max-w-xl px-4 sm:px-6">
          <h2
            className="mb-4 text-3xl font-extrabold sm:text-4xl"
            style={{ fontFamily: 'var(--font-head)' }}
          >
            Ready to transform your hiring?
          </h2>
          <p className="mb-8 text-base text-blue-100">
            Join 40+ companies already using Canvue to conduct smarter, fairer
            interviews.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-blue-700 shadow-lg transition hover:bg-blue-50"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="mailto:sales@canvue.ai"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-50 py-12">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-8 grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <p
                className="mb-2 text-lg font-extrabold tracking-wider text-slate-900"
                style={{ fontFamily: 'var(--font-head)' }}
              >
                CAN<span className="text-blue-600">VUE</span>
              </p>
              <p className="text-sm leading-relaxed text-slate-500">
                AI-powered interview platform for modern hiring teams.
              </p>
            </div>
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Product
              </p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/" className="transition hover:text-blue-600">Features</Link></li>
                <li><Link to="/" className="transition hover:text-blue-600">Pricing</Link></li>
                <li><Link to="/" className="transition hover:text-blue-600">ATS Score</Link></li>
                <li><Link to="/" className="transition hover:text-blue-600">Mock Interviews</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Resources
              </p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/" className="transition hover:text-blue-600">Documentation</Link></li>
                <li><Link to="/" className="transition hover:text-blue-600">Blog</Link></li>
                <li><Link to="/" className="transition hover:text-blue-600">Changelog</Link></li>
                <li><Link to="/" className="transition hover:text-blue-600">Support</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Company
              </p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/" className="transition hover:text-blue-600">About</Link></li>
                <li><Link to="/" className="transition hover:text-blue-600">Careers</Link></li>
                <li><Link to="/" className="transition hover:text-blue-600">Privacy Policy</Link></li>
                <li><Link to="/" className="transition hover:text-blue-600">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} Canvue. All rights reserved.
            </p>
            <a
              href="mailto:hello@canvue.ai"
              className="text-xs font-medium text-blue-600 transition hover:text-blue-700"
            >
              hello@canvue.ai
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
