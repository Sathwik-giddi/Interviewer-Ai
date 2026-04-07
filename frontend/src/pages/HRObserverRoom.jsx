/**
 * HRObserverRoom — Full HR monitoring panel with:
 * - Live WebRTC video of candidate
 * - Real-time interview state (question, answer, progress)
 * - Proctoring alerts
 * - Request to Speak (two-way audio)
 * - AI Takeover: HR can type a custom question and have it spoken to candidate
 * - Activity log
 */
import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { io } from 'socket.io-client'
import { apiUrl, getBackendBaseUrl, getSocketServerUrl } from '../lib/runtimeConfig'

const SIGNAL  = getSocketServerUrl()
const BACKEND = getBackendBaseUrl()
const ICE = { iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
] }

export default function HRObserverRoom() {
  const { campaignId } = useParams()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  // Connection
  const [connected, setConnected]             = useState(false)
  const [candidatePresent, setCandidatePresent] = useState(false)
  const [streamActive, setStreamActive]       = useState(false)

  // HR Controls
  const [speaking, setSpeaking]               = useState(false)
  const [speakRequested, setSpeakRequested]   = useState(false)

  // HR Custom Question (AI Takeover)
  const [hrQuestion, setHrQuestion]           = useState('')
  const [sendingQuestion, setSendingQuestion] = useState(false)

  // Live interview state
  const [interviewState, setInterviewState]   = useState(null)
  const [candidateAnswer, setCandidateAnswer] = useState('')
  const [answerType, setAnswerType]           = useState('text')
  const [submittedAnswers, setSubmittedAnswers] = useState([])

  // Proctoring + Log
  const [procAlerts, setProcAlerts]           = useState([])
  const [chatLog, setChatLog]                 = useState([])
  const [sessionEnded, setSessionEnded]       = useState(false)

  // Proctoring state (mood + objects from candidate)
  const [candidateMood, setCandidateMood]     = useState(null)
  const [candidateObjects, setCandidateObjects] = useState([])

  // Right panel tab
  const [rightTab, setRightTab]               = useState('live') // 'live' | 'proctoring' | 'log'

  // Refs
  const remoteVideoRef    = useRef(null)
  const localStreamRef    = useRef(null)
  const peerRef           = useRef(null)
  const socketRef         = useRef(null)
  const pendingCandidates = useRef([])

  /* ═══════════════════ SOCKET + WEBRTC ═══════════════════ */
  useEffect(() => {
    const socket = io(SIGNAL, { transports: ['websocket', 'polling'], reconnection: true })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join-room', { roomId: campaignId, userId: currentUser.uid, role: 'hr' })
      addLog('system', 'Connected as HR observer.')
    })
    socket.on('disconnect', () => { setConnected(false); addLog('system', 'Disconnected.') })

    // Candidate
    socket.on('peer-joined', ({ role }) => {
      if (role === 'candidate') {
        setCandidatePresent(true)
        addLog('system', 'Candidate joined.')
        // Request their video stream
        socket.emit('request-stream', { roomId: campaignId })
      }
    })
    socket.on('room-state', ({ hasCandidate }) => {
      setCandidatePresent(hasCandidate)
      if (hasCandidate) {
        addLog('system', 'Candidate in room.')
        // Request their video stream (they might have joined before us)
        socket.emit('request-stream', { roomId: campaignId })
      }
    })
    socket.on('peer-left', ({ role }) => { if (role === 'candidate') { setCandidatePresent(false); setStreamActive(false); addLog('system', 'Candidate left.') } })

    // WebRTC
    socket.on('offer', async ({ from, offer }) => {
      const pc = createPC(from)
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      for (const c of pendingCandidates.current) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
      pendingCandidates.current = []
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('answer', { to: from, answer })
    })
    socket.on('answer', async ({ answer }) => {
      if (peerRef.current?.signalingState === 'have-local-offer')
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer))
    })
    socket.on('ice-candidate', async ({ candidate }) => {
      if (peerRef.current?.remoteDescription) await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
      else pendingCandidates.current.push(candidate)
    })

    // HR speak accepted
    socket.on('hr-speak-accepted', () => { setSpeaking(true); setSpeakRequested(false); enableMic(); addLog('system', 'Speaking to candidate — AI paused.') })

    // Interview state relay
    socket.on('interview-state', (data) => setInterviewState(data))
    socket.on('candidate-typing', (data) => { setCandidateAnswer(data.currentAnswer || ''); setAnswerType(data.answerType || 'text') })
    socket.on('ai-speaking', (data) => addLog('ai', `Asking: "${data.question.substring(0, 80)}${data.question.length > 80 ? '…' : ''}"`))
    socket.on('answer-submitted', (data) => {
      setSubmittedAnswers(prev => [...prev, { qIndex: data.qIndex, answer: data.answer }])
      setCandidateAnswer('')
      addLog('candidate', `Answered Q${data.qIndex + 1}`)
    })

    // Proctoring
    socket.on('proctoring-alert', ({ warning }) => {
      setProcAlerts(prev => [{ warning, ts: new Date().toLocaleTimeString() }, ...prev].slice(0, 50))
    })

    // Proctoring state — mood + objects
    socket.on('proctoring-state', (data) => {
      if (data.mood) setCandidateMood(data.mood)
      if (data.objects) setCandidateObjects(data.objects)
    })

    // Custom question spoken confirmation
    socket.on('hr-question-spoken', () => { addLog('system', 'Custom question delivered to candidate.') })

    // End
    socket.on('interview-ended', () => { setSessionEnded(true); addLog('system', 'Interview ended.') })

    return () => { socket.disconnect(); peerRef.current?.close(); localStreamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [campaignId, currentUser])

  function addLog(type, text) {
    setChatLog(prev => [...prev, { type, text, ts: new Date().toLocaleTimeString() }])
  }

  const remotePeerIdRef = useRef(null)

  function createPC(remotePeerId) {
    peerRef.current?.close()
    remotePeerIdRef.current = remotePeerId
    const pc = new RTCPeerConnection(ICE)
    peerRef.current = pc
    pc.onicecandidate = ({ candidate }) => { if (candidate) socketRef.current?.emit('ice-candidate', { to: remotePeerId, candidate }) }
    pc.ontrack = ({ streams }) => {
      if (remoteVideoRef.current && streams[0]) {
        remoteVideoRef.current.srcObject = streams[0]
        remoteVideoRef.current.play?.().catch(() => {})
        setStreamActive(true)
      }
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') setStreamActive(false)
    }
    return pc
  }

  async function enableMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream
      const pc = peerRef.current
      if (pc && remotePeerIdRef.current) {
        stream.getTracks().forEach(track => pc.addTrack(track, stream))
        // Renegotiate so candidate receives the new audio track
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socketRef.current?.emit('offer', { to: remotePeerIdRef.current, offer })
        addLog('system', 'Microphone enabled — audio sent to candidate.')
      }
    } catch { addLog('system', 'Microphone unavailable.') }
  }

  /* ═══════════════════ HR CONTROLS ═══════════════════ */
  function requestToSpeak() {
    socketRef.current?.emit('hr-speak-request', { roomId: campaignId })
    setSpeakRequested(true)
    addLog('hr', 'Requested to speak…')
  }

  function endSpeaking() {
    setSpeaking(false); setSpeakRequested(false)
    localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null
    socketRef.current?.emit('hr-speak-end', { roomId: campaignId })
    addLog('system', 'Ended speaking. AI resumed.')
  }

  /* ═══════════════════ HR CUSTOM QUESTION (AI TAKEOVER) ═══════════════════ */
  async function sendHrQuestion(e) {
    e.preventDefault()
    if (!hrQuestion.trim()) return
    setSendingQuestion(true)

    // Emit the custom question to candidate via socket
    socketRef.current?.emit('hr-custom-question', { roomId: campaignId, question: hrQuestion, from: 'HR' })
    addLog('hr', `Custom question: "${hrQuestion}"`)

    // Generate TTS for the question via backend so candidate hears it
    try {
      const res = await fetch(apiUrl('/api/text-to-speech'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: hrQuestion }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.audio_url) {
          // Send audio URL to candidate
          socketRef.current?.emit('hr-question-audio', { roomId: campaignId, audioUrl: `${BACKEND}${data.audio_url}`, question: hrQuestion })
        }
      }
    } catch { /* TTS failed — candidate will see text */ }

    setHrQuestion('')
    setSendingQuestion(false)
    toast.info('Question sent to candidate.')
  }

  /* ═══════════════════ RENDER ═══════════════════ */
  const is = interviewState

  return (
    <div className="page-enter" style={S.page}>
      {/* ═══ LEFT: Video + Controls ═══ */}
      <div style={S.leftPanel}>
        {/* Status */}
        <div style={S.statusBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ ...S.dot, background: connected ? '#22c55e' : '#ccc' }} className={connected ? 'pulse' : ''} />
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {connected ? (candidatePresent ? 'LIVE' : 'WAITING') : 'CONNECTING…'}
            </span>
          </div>
          {is && <span style={{ fontSize: '14px', fontFamily: 'monospace' }}>{fmtTime(is.timer || 0)}</span>}
        </div>

        {/* Video */}
        <div style={S.videoBox}>
          {candidatePresent ? (
            <video ref={remoteVideoRef} autoPlay playsInline controls style={S.video} />
          ) : (
            <div style={S.noVideo}>
              <span style={{ fontSize: '40px' }}>📹</span>
              <p style={{ fontSize: '13px', color: '#888', marginTop: '8px' }}>{sessionEnded ? 'Session ended' : 'Waiting for candidate…'}</p>
            </div>
          )}
          {speaking && <div style={S.liveOverlay}>🎙 YOU ARE LIVE — AI PAUSED</div>}
          {streamActive && !speaking && <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(34,197,94,0.9)', color: '#fff', padding: '4px 8px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>● LIVE</div>}
        </div>

        {/* Candidate info */}
        <div style={S.infoBox}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {is ? 'CANDIDATE' : 'ROOM'}
          </p>
          <p style={{ fontSize: '15px', fontWeight: 600, marginTop: '2px' }}>{is?.candidateName || 'Waiting…'}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Room: {campaignId}</p>
        </div>

        {/* ── HR SPEAK CONTROLS ── */}
        <div style={S.controls}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>VOICE CONTROL</p>
          {!speaking ? (
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={requestToSpeak} disabled={!candidatePresent || sessionEnded || speakRequested}>
              {speakRequested ? '⏳ Waiting for candidate…' : '🎙 Request to Speak'}
            </button>
          ) : (
            <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={endSpeaking}>
              ⏹ End & Resume AI
            </button>
          )}
          {speaking && <p style={{ fontSize: '11px', color: 'var(--primary)', textAlign: 'center', marginTop: '6px' }}>AI paused — you're live</p>}
        </div>

        {/* ── HR CUSTOM QUESTION (AI TAKEOVER) ── */}
        <div style={S.controls}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
            ASK CUSTOM QUESTION
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Type a question — it will be spoken aloud to the candidate via AI voice, replacing the current question flow.
          </p>
          <form onSubmit={sendHrQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <textarea
              value={hrQuestion}
              onChange={e => setHrQuestion(e.target.value)}
              placeholder="Type your question here…"
              style={{ minHeight: '60px', padding: '8px 10px', fontSize: '13px', border: '1px solid var(--border)', fontFamily: 'var(--font-body)', resize: 'vertical' }}
              disabled={!candidatePresent || sessionEnded}
            />
            <button type="submit" className="btn btn-outline" style={{ justifyContent: 'center', fontSize: '12px' }} disabled={!hrQuestion.trim() || sendingQuestion || !candidatePresent || sessionEnded}>
              {sendingQuestion ? 'Sending…' : '📤 Send Question to Candidate'}
            </button>
          </form>
        </div>

        {/* Share link */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '11px' }} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/interview/${campaignId}`); toast.info('Copied!') }}>
            📋 Copy Candidate Link
          </button>
        </div>

        <button className="btn btn-ghost" style={{ margin: '0 16px 12px', fontSize: '11px' }} onClick={() => navigate('/hr')}>← Dashboard</button>
      </div>

      {/* ═══ RIGHT: Tabs ═══ */}
      <div style={S.rightPanel}>
        {/* Tab bar */}
        <div style={S.tabBar}>
          {['live', 'proctoring', 'log'].map(t => (
            <button key={t} style={{ ...S.tab, ...(rightTab === t ? S.tabActive : {}) }} onClick={() => setRightTab(t)}>
              {t === 'live' && 'Live Interview'}
              {t === 'proctoring' && `Proctoring (${procAlerts.length})`}
              {t === 'log' && 'Activity Log'}
            </button>
          ))}
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

          {/* ── LIVE TAB ── */}
          {rightTab === 'live' && (
            <>
              {is ? (
                <>
                  {/* Progress */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ flex: 1, height: '4px', background: 'var(--border)' }}>
                      <div style={{ height: '100%', background: 'var(--primary)', width: `${(is.qIndex / is.totalQuestions) * 100}%`, transition: 'width 0.4s' }} />
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', flexShrink: 0 }}>Q{is.qIndex + 1}/{is.totalQuestions}</span>
                    <span className={`badge badge-${is.currentDifficulty === 'advanced' ? 'danger' : is.currentDifficulty === 'intermediate' ? 'warning' : 'success'}`} style={{ fontSize: '10px' }}>
                      {is.currentDifficulty}
                    </span>
                  </div>

                  {/* Current question */}
                  <div style={S.questionCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ fontFamily: 'var(--font-head)', fontSize: '22px', color: 'var(--primary)' }}>Q{is.qIndex + 1}</span>
                      {is.currentQuestionType === 'code' && <span style={{ fontSize: '11px', background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', fontWeight: 700 }}>CODE</span>}
                      {is.aiSpeaking && <span className="badge badge-primary" style={{ fontSize: '10px' }}>AI SPEAKING</span>}
                    </div>
                    <p style={{ fontSize: '14px', lineHeight: '1.7' }}>{is.currentQuestion}</p>
                  </div>

                  {/* Candidate's live answer */}
                  <div style={{ marginTop: '16px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      CANDIDATE'S LIVE ANSWER
                    </p>
                    {answerType === 'code' ? (
                      <pre style={S.liveCode}>{candidateAnswer || '// Waiting…'}</pre>
                    ) : (
                      <div style={S.liveAnswer}>{candidateAnswer || 'Waiting for candidate to answer…'}</div>
                    )}
                  </div>

                  {/* Submitted answers */}
                  {submittedAnswers.length > 0 && (
                    <div style={{ marginTop: '24px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        SUBMITTED ANSWERS ({submittedAnswers.length})
                      </p>
                      <div style={{ border: '1px solid var(--border)' }}>
                        {submittedAnswers.map((a, i) => (
                          <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                            <span style={{ color: 'var(--primary)', fontWeight: 700, marginRight: '8px' }}>Q{a.qIndex + 1}</span>
                            <span>{a.answer}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <span style={{ fontSize: '48px' }}>⏳</span>
                  <p style={{ fontSize: '16px', color: 'var(--text-muted)', marginTop: '16px' }}>Waiting for candidate to start…</p>
                  <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '12px 16px', fontSize: '13px', fontFamily: 'monospace', marginTop: '16px', wordBreak: 'break-all' }}>
                    {window.location.origin}/interview/{campaignId}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Share this link with the candidate.</p>
                </div>
              )}
            </>
          )}

          {/* ── PROCTORING TAB ── */}
          {rightTab === 'proctoring' && (
            <>
              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '20px', marginBottom: '16px' }}>
                PROCTORING
                {procAlerts.length > 0 && <span className="badge badge-danger" style={{ marginLeft: '12px', fontSize: '10px' }}>{procAlerts.length} alerts</span>}
              </h2>

              {/* Live Mood Indicator */}
              <div style={{ border: '1px solid var(--border)', padding: '16px', marginBottom: '16px', background: 'var(--bg-subtle)' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>CANDIDATE MOOD</p>
                {candidateMood ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '32px' }}>
                      {candidateMood.expression === 'Happy' ? '😊' : candidateMood.expression === 'Sad' ? '😢' : candidateMood.expression === 'Angry' ? '😠' : candidateMood.expression === 'Nervous' ? '😰' : candidateMood.expression === 'Surprised' ? '😲' : candidateMood.expression === 'Disgusted' ? '🤢' : '😐'}
                    </span>
                    <div>
                      <p style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-head)' }}>{candidateMood.expression}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <div style={{ width: '100px', height: '6px', background: 'var(--border)', borderRadius: '3px' }}>
                          <div style={{ width: `${candidateMood.confidence}%`, height: '100%', background: candidateMood.confidence > 70 ? 'var(--primary)' : '#eab308', borderRadius: '3px', transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{candidateMood.confidence}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Waiting for candidate…</p>
                )}
              </div>

              {/* Foreign Objects */}
              <div style={{ border: '1px solid var(--border)', padding: '16px', marginBottom: '16px', background: candidateObjects.length > 0 ? '#fff5f5' : 'var(--bg-subtle)' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: candidateObjects.length > 0 ? 'var(--danger)' : 'var(--text-muted)', marginBottom: '10px' }}>
                  OBJECT DETECTION {candidateObjects.length > 0 ? '⚠️' : '✓'}
                </p>
                {candidateObjects.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {candidateObjects.map((obj, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#fee2e2', border: '1px solid #fca5a5', fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>
                        <span>{obj.name === 'cell phone' ? '📱' : obj.name === 'book' ? '📖' : obj.name === 'laptop' ? '💻' : '🔍'}</span>
                        {obj.name} <span style={{ fontWeight: 400, fontSize: '11px' }}>({obj.confidence}%)</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No foreign objects detected.</p>
                )}
              </div>

              {/* Alert History */}
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>ALERT HISTORY</p>
              {procAlerts.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <p>No proctoring alerts.</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>Alerts appear here when face, mood, or object detection flags issues.</p>
                </div>
              ) : (
                <div style={{ border: '1px solid var(--border)' }}>
                  {procAlerts.map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', padding: '10px 14px', borderBottom: '1px solid var(--border)', background: i === 0 ? '#fff5f5' : 'var(--bg)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'monospace' }}>{a.ts}</span>
                      <span style={{ fontSize: '13px', color: a.warning.includes('object') || a.warning.includes('Object') ? '#dc2626' : a.warning.includes('Expression') || a.warning.includes('mood') ? '#7353F6' : 'var(--danger)' }}>{a.warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── LOG TAB ── */}
          {rightTab === 'log' && (
            <>
              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '20px', marginBottom: '16px' }}>ACTIVITY LOG</h2>
              <div style={{ border: '1px solid var(--border)' }}>
                {chatLog.length === 0 ? (
                  <p style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>No activity yet.</p>
                ) : (
                  [...chatLog].reverse().map((e, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'monospace' }}>{e.ts}</span>
                      <span style={{
                        color: e.type === 'hr' ? 'var(--primary)' : e.type === 'ai' ? '#7353F6' : e.type === 'candidate' ? '#22c55e' : 'var(--text-muted)',
                        fontWeight: e.type === 'hr' || e.type === 'ai' ? 600 : 400,
                      }}>
                        {e.type === 'hr' && '🎙 HR: '}{e.type === 'ai' && '🤖 '}{e.type === 'candidate' && '👤 '}
                        {e.text}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Session ended */}
          {sessionEnded && (
            <div style={{ marginTop: '24px', padding: '20px', background: 'var(--primary-light)', border: '1px solid var(--primary)' }}>
              <strong>Interview ended.</strong>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Candidate completed {submittedAnswers.length} question(s).</p>
              <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => navigate('/hr')}>Back to Dashboard</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function fmtTime(s) { return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }

const S = {
  page: { display: 'grid', gridTemplateColumns: '380px 1fr', height: 'calc(100vh - 60px)', overflow: 'hidden' },
  leftPanel: { borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-subtle)', overflowY: 'auto' },
  statusBar: { padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  dot: { width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block', flexShrink: 0 },
  videoBox: { borderBottom: '1px solid var(--border)', background: '#000', position: 'relative', flexShrink: 0 },
  video: { width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' },
  noVideo: { width: '100%', aspectRatio: '16/9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#111', color: '#888' },
  liveOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(115,83,246,0.9)', color: '#fff', padding: '8px 12px', fontSize: '12px', fontWeight: 700, textAlign: 'center' },
  infoBox: { padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 },
  controls: { padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 },
  rightPanel: { display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' },
  tabBar: { display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 },
  tab: { flex: 1, padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer' },
  tabActive: { color: 'var(--primary)', borderBottomColor: 'var(--primary)' },
  questionCard: { border: '1px solid var(--border)', padding: '16px 20px', background: 'var(--bg-subtle)' },
  liveAnswer: { minHeight: '80px', padding: '12px', border: '1px solid var(--border)', background: 'var(--bg-subtle)', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' },
  liveCode: { minHeight: '80px', padding: '12px', border: '1px solid var(--border)', background: '#1e1e1e', color: '#d4d4d4', fontSize: '13px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '250px' },
}
