import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

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

const buttonBase =
  'inline-flex min-h-11 items-center justify-center rounded-md px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2'

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-[0.92fr_1.08fr] md:items-center md:px-8 lg:py-20">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">
              AI interview software
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-normal md:text-6xl">
              Run interviews online without turning them into a cold script.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 md:text-lg">
              Canvue lets teams run browser-based interviews with resume input,
              follow-up questions, live recruiter control, coding support, and
              reports after the session.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/signup"
                className={`${buttonBase} bg-violet-500 text-white hover:bg-violet-400`}
              >
                Start free trial
              </Link>
              <a
                href="mailto:sales@canvue.ai"
                className={`${buttonBase} border border-white/20 bg-white/10 text-white hover:bg-white/15`}
              >
                Book a demo
              </a>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
              <span>No credit card required</span>
              <span>Works in the browser</span>
              <span>Built for hiring and practice</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5 shadow-2xl">
            <img
              src="/interview-room-proof.png"
              alt="Screenshot of the Canvue interview room"
              className="aspect-[16/10] w-full object-cover"
            />
            <p className="border-t border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
              Actual interview room from this product
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 py-8 md:grid-cols-3 md:px-8">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-slate-200 bg-white p-6">
              <span className="block text-3xl font-bold text-violet-600">{stat.value}</span>
              <span className="mt-1 block text-sm text-slate-600">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="why-canvue" className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-violet-600">
              Proof
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-normal md:text-4xl">
              Enough to tell you this is a real product
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              No icon grid. No made-up quotes. Just the product, how it behaves,
              and what the team gets from it.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {proofItems.map((item) => (
              <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>

                {item.kind === 'image' && (
                  <img
                    src="/interview-room-proof.png"
                    alt="Canvue interview room screenshot"
                    className="mt-5 aspect-[16/10] w-full rounded-md border border-slate-200 object-cover"
                  />
                )}

                {item.transcript && (
                  <pre className="mt-5 whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-sm leading-6 text-slate-100">
                    {item.transcript}
                  </pre>
                )}

                {item.results && (
                  <ul className="mt-5 space-y-3 text-sm text-slate-700">
                    {item.results.map((result) => (
                      <li key={result} className="flex gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-violet-500" />
                        <span>{result}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="border-y border-slate-200 bg-slate-50 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-violet-600">
              How it works
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-normal md:text-4xl">
              Simple from setup to review
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              A hiring manager should be able to understand the flow in under a minute.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-lg border border-slate-200 bg-white p-5">
                <span className="text-sm font-bold text-violet-600">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6 md:px-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-violet-600">
              FAQ
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-normal md:text-4xl">
              Questions teams usually ask first
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Short answers before you spend time setting it up.
            </p>
          </div>

          <div className="mt-8 divide-y divide-slate-200 rounded-lg border border-slate-200">
            {faqs.map((faq, index) => (
              <article key={faq.q} className="bg-white">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold text-slate-950"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-500 transition ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-5 text-sm leading-6 text-slate-600">{faq.a}</div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-violet-600 py-14 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-violet-100">
              Next step
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-normal">
              Try it with a real role and see how the interview feels.
            </h2>
            <p className="mt-3 text-sm leading-6 text-violet-100">
              Start with the free plan if you want to test it yourself. If your
              team wants a walkthrough, book a demo and we will show you the full flow.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/signup"
              className={`${buttonBase} bg-white text-violet-700 hover:bg-violet-50`}
            >
              Get started
            </Link>
            <a
              href="mailto:sales@canvue.ai"
              className={`${buttonBase} border border-white/30 bg-white/10 text-white hover:bg-white/15`}
            >
              Talk to sales
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-8">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-white">CANVUE</p>
              <p className="mt-3 max-w-sm text-sm leading-6">
                Browser-based interviews with recruiter control, coding support,
                and reporting in one place.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">Product</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li>AI interviews</li>
                <li>Live recruiter control</li>
                <li>Code editor</li>
                <li>Reports</li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">Company</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link to="/login" className="hover:text-white">Login</Link></li>
                <li><Link to="/signup" className="hover:text-white">Start free trial</Link></li>
                <li><a href="mailto:sales@canvue.ai" className="hover:text-white">sales@canvue.ai</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-5 text-sm">
            <p>&copy; {new Date().getFullYear()} Canvue. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
