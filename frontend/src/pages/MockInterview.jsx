/**
 * MockInterview — Practice interview page for candidates
 * Random AI questions, voice/text answers, AI evaluation, not saved to HR reports
 */
import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import CodeEditor from '../components/CodeEditor'
import TalkingAvatar from '../components/TalkingAvatar'

const BACKEND = import.meta.env.VITE_BACKEND_URL || ''

export default function MockInterview() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [phase, setPhase] = useState('setup')
  const [jobTitle, setJobTitle] = useState('')
  const [difficulty, setDifficulty] = useState('intermediate')
  const [questions, setQuestions] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [textAnswer, setTextAnswer] = useState('')
  const [codeValue, setCodeValue] = useState('')
  const [codeLang, setCodeLang] = useState('javascript')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [evaluation, setEvaluation] = useState(null)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [liveTranscribing, setLiveTranscribing] = useState(false)
  const [aiSpeaking, setAiSpeaking] = useState(false)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const audioRef = useRef(null)
  const speechRecRef = useRef(null)

  async function startMock(e) {
    e.preventDefault()
    setLoading(true)
    const title = jobTitle.trim() || 'Software Engineer'
    const score = difficulty === 'advanced' ? 80 : difficulty === 'intermediate' ? 50 : 20

    try {
      const res = await fetch(`${BACKEND}/api/select-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_title: title, match_score: score }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.questions?.length) {
          setQuestions(data.questions)
          speakQuestion(data.questions[0])
          setPhase('interview')
          setLoading(false)
          return
        }
      }
    } catch {}

    setQuestions([
      { id: 'mq1', text: `Describe your experience with ${title} related technologies.`, difficulty: 'basic', type: 'text', modelAnswer: 'Cover specific examples.', rubric: 'Depth and relevance.' },
      { id: 'mq2', text: 'Walk me through how you debug a complex issue in production.', difficulty: 'intermediate', type: 'text', modelAnswer: 'Triage, logs, reproduce, fix, post-mortem.', rubric: 'Structured approach.' },
      { id: 'mq3', text: 'Write a function to reverse a linked list.', difficulty: 'intermediate', type: 'code', modelAnswer: 'Iterative or recursive reversal.', rubric: 'Correct logic, edge cases.' },
      { id: 'mq4', text: 'How would you design a URL shortener? Discuss scalability.', difficulty: 'advanced', type: 'text', modelAnswer: 'Hash-based, distributed DB, caching, analytics.', rubric: 'System design depth.' },
      { id: 'mq5', text: 'What are the trade-offs between SQL and NoSQL databases?', difficulty: 'basic', type: 'text', modelAnswer: 'ACID vs eventual consistency, schema flexibility.', rubric: 'Understanding of both paradigms.' },
    ])
    setPhase('interview')
    setLoading(false)
  }

  function speakQuestion(q) {
    if ('speechSynthesis' in window && q) {
      window.speechSynthesis.cancel()
      setAiSpeaking(true)
      const u = new SpeechSynthesisUtterance(q.text)
      u.rate = 0.95
      u.onend = () => setAiSpeaking(false)
      u.onerror = () => setAiSpeaking(false)
      window.speechSynthesis.speak(u)
    }
  }

  function startLiveTranscription() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.warning('Live transcription not supported in this browser. Use Record instead.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    let finalTranscript = ''

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
          setTextAnswer(prev => prev ? prev + ' ' + transcript : transcript)
        } else {
          interim = transcript
        }
      }
    }

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        console.warn('Speech recognition error:', event.error)
      }
    }

    recognition.onend = () => {
      if (speechRecRef.current && liveTranscribing) {
        try { recognition.start() } catch {}
      }
    }

    try {
      recognition.start()
      speechRecRef.current = recognition
      setLiveTranscribing(true)
    } catch {
      toast.error('Could not start live transcription.')
    }
  }

  function stopLiveTranscription() {
    if (speechRecRef.current) {
      speechRecRef.current.stop()
      speechRecRef.current = null
    }
    setLiveTranscribing(false)
  }

  useEffect(() => {
    return () => {
      speechRecRef.current?.stop()
      window.speechSynthesis?.cancel()
    }
  }, [])

  const recMimeRef = useRef('audio/webm')

  async function startRecording() {
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      toast.error('Microphone access denied. Please allow mic permissions.')
      return
    }
    streamRef.current = stream
    chunksRef.current = []

    const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', '']
    let mr = null
    for (const mime of mimeTypes) {
      try {
        const opts = mime ? { mimeType: mime } : {}
        if (mime && !MediaRecorder.isTypeSupported(mime)) continue
        mr = new MediaRecorder(stream, opts)
        recMimeRef.current = mime || 'audio/webm'
        break
      } catch { /* try next */ }
    }
    if (!mr) { toast.error('Recording not supported. Please type your answer.'); return }

    mr.ondataavailable = e => e.data.size && chunksRef.current.push(e.data)
    mr.onstop = transcribeAudio
    mr.start()
    mediaRecorderRef.current = mr
    setRecording(true)
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    setRecording(false)
  }

  async function transcribeAudio() {
    setTranscribing(true)
    const mime = recMimeRef.current || 'audio/webm'
    const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm'
    const blob = new Blob(chunksRef.current, { type: mime })
    const fd = new FormData()
    fd.append('audio', blob, `mock.${ext}`)
    try {
      const res = await fetch(`${BACKEND}/api/transcribe`, { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        if (data.text) setTextAnswer(prev => prev ? prev + ' ' + data.text : data.text)
      }
    } catch {}
    setTranscribing(false)
  }

  async function submitAnswer() {
    const q = questions[qIndex]
    if (!q) return
    setSubmitting(true)
    window.speechSynthesis?.cancel()

    const answerText = q.type === 'code' ? codeValue : textAnswer
    const newAnswer = { question: q.text, answer: answerText, type: q.type }

    let evalResult = { score: 5, feedback: 'Practice answer recorded.' }
    try {
      const res = await fetch(`${BACKEND}/api/evaluate-answer-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.text, answer: answerText, model_answer: q.modelAnswer || '', rubric: q.rubric || '' }),
      })
      if (res.ok) evalResult = await res.json()
    } catch {}

    newAnswer.eval = evalResult
    const updated = [...answers, newAnswer]
    setAnswers(updated)
    setTextAnswer('')
    setCodeValue('')

    if (qIndex + 1 >= questions.length) {
      const scores = updated.map(a => a.eval?.score || 5)
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10)
      setEvaluation({ overallScore: avg, answers: updated })
      setPhase('ended')
    } else {
      setQIndex(qIndex + 1)
      speakQuestion(questions[qIndex + 1])
    }
    setSubmitting(false)
  }

  const currentQ = questions[qIndex]
  const isCode = currentQ?.type === 'code'

  // ── ENDED PHASE ──
  if (phase === 'ended') {
    const score = evaluation?.overallScore || 0
    const scoreColor = score >= 70 ? 'var(--success)' : score >= 40 ? 'var(--warning)' : 'var(--danger)'
    return (
      <div className="page-enter" style={{ minHeight: 'calc(100vh - 60px)', background: '#f5f3ff', padding: '32px 16px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          {/* Score hero */}
          <div style={{ textAlign: 'center', marginBottom: '32px', padding: '40px 24px', background: '#fff', border: '1px solid var(--border)',  }}>
            <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '32px', marginBottom: '16px' }}>MOCK COMPLETE</h1>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="8" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={scoreColor} strokeWidth="8"
                  strokeDasharray={`${score * 3.27} 327`} strokeDashoffset="0"
                  transform="rotate(-90 60 60)" strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 1s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <span style={{ fontFamily: 'var(--font-head)', fontSize: '32px', color: scoreColor }}>{score}</span>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/100</span>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Practice session - results are NOT saved to your profile.</p>
          </div>

          {answers.map((a, i) => (
            <div key={i} className="card" style={{ marginBottom: '12px', padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-head)', fontSize: '18px', color: 'var(--primary)' }}>Q{i + 1}</span>
                    <span className={`badge badge-${a.eval?.score >= 7 ? 'success' : a.eval?.score >= 4 ? 'warning' : 'danger'}`} style={{ fontSize: '10px' }}>
                      {a.eval?.score}/10
                    </span>
                  </div>
                  <p style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>{a.question}</p>
                  <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '10px 12px', fontSize: '13px', marginBottom: '8px', maxHeight: '100px', overflowY: 'auto' }}>
                    {a.answer || 'No answer'}
                  </div>
                  {a.eval?.feedback && (
                    <div style={{ background: 'var(--primary-light)', padding: '10px 12px', fontSize: '12px', borderLeft: '3px solid var(--primary)' }}>
                      {a.eval.feedback}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => { setPhase('setup'); setAnswers([]); setQIndex(0); setEvaluation(null) }}>Try Again</button>
            <button className="btn btn-outline" onClick={() => navigate('/candidate')}>Dashboard</button>
          </div>
        </div>
      </div>
    )
  }

  // ── SETUP & INTERVIEW ──
  return (
    <div className="page-enter" style={{ minHeight: 'calc(100vh - 60px)', background: '#f5f3ff' }}>
      <div className="container" style={{ padding: '32px 24px', maxWidth: '720px' }}>

        {phase === 'setup' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ width: '64px', height: '64px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              </div>
              <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '36px' }}>MOCK INTERVIEW</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>Practice with AI-generated questions. Results are NOT saved to your profile.</p>
            </div>

            <form onSubmit={startMock} className="card" style={{ padding: '28px',  }}>
              <div className="form-group">
                <label>Job Title / Role</label>
                <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Frontend Developer" />
              </div>
              <div className="form-group">
                <label>Difficulty</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { key: 'basic', label: 'Basic', color: 'var(--success)' },
                    { key: 'intermediate', label: 'Intermediate', color: 'var(--warning)' },
                    { key: 'advanced', label: 'Advanced', color: 'var(--danger)' },
                  ].map(d => (
                    <button key={d.key} type="button" className={`btn ${difficulty === d.key ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, justifyContent: 'center', textTransform: 'capitalize', fontSize: '13px' }} onClick={() => setDifficulty(d.key)}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '14px' }}>
                {loading ? <><span className="spinner" style={{ width: '16px', height: '16px' }} /> Generating Questions...</> : 'Start Mock Interview'}
              </button>
            </form>
          </>
        )}

        {phase === 'interview' && currentQ && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '24px' }}>MOCK INTERVIEW</h2>
              <span className="badge badge-primary" style={{ fontSize: '10px' }}>PRACTICE</span>
            </div>

            {/* AI Avatar + Progress */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', padding: '20px', background: '#fff', border: '1px solid var(--border)',  }}>
              <TalkingAvatar isSpeaking={aiSpeaking} size={80} />
            </div>

            <div style={{ height: '4px', background: 'var(--border)', marginBottom: '8px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), #9b7dff)', width: `${((qIndex + 1) / questions.length) * 100}%`, transition: 'width 0.5s ease' }} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>Question {qIndex + 1} of {questions.length}</p>

            <div className="card" style={{ marginBottom: '16px', padding: '24px', borderLeft: '3px solid var(--primary)' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'var(--font-head)', fontSize: '28px', color: 'var(--primary)' }}>Q{qIndex + 1}</span>
                <div>
                  <p style={{ fontSize: '15px', lineHeight: '1.7' }}>{currentQ.text}</p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <span className={`badge badge-${currentQ.difficulty === 'advanced' ? 'danger' : currentQ.difficulty === 'intermediate' ? 'warning' : 'success'}`} style={{ fontSize: '10px' }}>
                      {currentQ.difficulty}
                    </span>
                    {currentQ.type === 'code' && <span className="badge badge-primary" style={{ fontSize: '10px' }}>CODE</span>}
                  </div>
                </div>
              </div>
            </div>

            {isCode ? (
              <CodeEditor value={codeValue} onChange={v => setCodeValue(v || '')} language={codeLang} onLanguageChange={setCodeLang} />
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button className={`btn ${recording ? 'btn-danger' : 'btn-ghost'}`} onClick={recording ? stopRecording : startRecording} style={{ fontSize: '12px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                    {recording ? 'Stop' : 'Record'}
                  </button>
                  <button
                    className={`btn ${liveTranscribing ? 'btn-danger' : 'btn-ghost'}`}
                    onClick={liveTranscribing ? stopLiveTranscription : startLiveTranscription}
                    style={{ fontSize: '12px' }}
                  >
                    {liveTranscribing ? 'Stop Live' : 'Live Transcribe'}
                  </button>
                  {transcribing && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Transcribing...</span>}
                  {liveTranscribing && (
                    <span style={{ fontSize: '12px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />
                      Live active
                    </span>
                  )}
                </div>
                <textarea value={textAnswer} onChange={e => setTextAnswer(e.target.value)} placeholder="Type, record, or use live transcription..." style={{ width: '100%', minHeight: '140px', padding: '14px', fontSize: '14px', border: '1.5px solid var(--border)', fontFamily: 'var(--font-body)', resize: 'vertical', background: '#fff' }} />
              </div>
            )}

            <button className="btn btn-primary" onClick={submitAnswer} disabled={submitting || (!isCode && !textAnswer.trim()) || (isCode && !codeValue.trim())} style={{ marginTop: '16px', width: '100%', justifyContent: 'center', padding: '14px' }}>
              {submitting ? 'Evaluating...' : qIndex === questions.length - 1 ? 'Submit & Finish' : 'Submit Answer'}
            </button>

            {answers.length > 0 && (
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.08em' }}>ANSWERED ({answers.length})</p>
                {answers.map((a, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Q{i + 1}: {a.answer?.substring(0, 60)}...</span>
                    <span style={{ fontWeight: 700, color: a.eval?.score >= 7 ? 'var(--success)' : 'var(--warning)' }}>{a.eval?.score}/10</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <audio ref={audioRef} />
    </div>
  )
}
