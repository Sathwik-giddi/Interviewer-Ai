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
import { apiUrl, getBackendBaseUrl, getSocketServerUrl, interviewUrl } from '../lib/runtimeConfig'
import { buildRtcConfigAsync, getSelectedCandidatePairInfo } from '../lib/webrtcConfig'

const SIGNAL  = getSocketServerUrl()
const BACKEND = getBackendBaseUrl()
const STREAM_RETRY_INTERVAL_MS = 2500
const STREAM_RETRY_LIMIT = 6

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
  const streamRetryTimerRef = useRef(null)
  const streamRetryCountRef = useRef(0)
  const lastStreamRequestAtRef = useRef(0)
  const candidatePresentRef = useRef(false)
  const streamActiveRef = useRef(false)
  const waitingForOfferRef = useRef(false)
  const remoteAudioRef = useRef(null)

  useEffect(() => { candidatePresentRef.current = candidatePresent }, [candidatePresent])
  useEffect(() => { streamActiveRef.current = streamActive }, [streamActive])

  function appendAlert(warning, ts = new Date().toLocaleTimeString()) {
    const text = typeof warning === 'string' ? warning : warning?.message || warning?.warning || ''
    if (!text) return
    setProcAlerts(prev => [{ warning: text, ts }, ...prev].slice(0, 50))
  }

  function updateMoodFromAlertText(text) {
    const warning = String(text || '').trim()
    if (!warning) return

    const expressionMatch = warning.match(/expression alert:\s*([a-z ]+?)(?:\s*\((\d+)% confidence\))?$/i)
    if (expressionMatch) {
      setCandidateMood({
        expression: expressionMatch[1].trim(),
        confidence: Number(expressionMatch[2] || 100),
      })
      return
    }

    const moodMatch = warning.match(/\b(happy|sad|angry|nervous|surprised|disgusted|neutral|fearful)\b/i)
    if (moodMatch) {
      setCandidateMood(prev => ({
        expression: normalizeExpressionLabel(moodMatch[1]),
        confidence: prev?.confidence || 100,
      }))
    }
  }

  function updateObjectsFromAlertText(text) {
    const warning = String(text || '').trim()
    if (!warning) return
    const objectMatch = warning.match(/foreign object detected:\s*(.+)$/i)
    if (!objectMatch) return
    const names = objectMatch[1]
      .split(',')
      .map(name => name.trim())
      .filter(Boolean)

    if (!names.length) return
    setCandidateObjects(names.map(name => ({ name, confidence: 100 })))
  }

  function applyAlertToProctoringState(warning) {
    updateMoodFromAlertText(warning)
    updateObjectsFromAlertText(warning)
  }

  function requestCandidateStream({ resetAttempts = false } = {}) {
    if (!socketRef.current || !campaignId || !candidatePresentRef.current || streamActiveRef.current || waitingForOfferRef.current) return
    if (resetAttempts) streamRetryCountRef.current = 0
    lastStreamRequestAtRef.current = Date.now()
    streamRetryCountRef.current += 1
    waitingForOfferRef.current = true
    socketRef.current.emit('request-stream', { roomId: campaignId })
    addLog('system', `Requested candidate stream${streamRetryCountRef.current > 1 ? ` (retry ${streamRetryCountRef.current})` : ''}.`)
  }

  async function playMediaElement(element, { muted = false } = {}) {
    if (!element) return false
    element.muted = muted
    try {
      await element.play()
      return true
    } catch {
      return false
    }
  }

  async function attachRemoteStream(stream) {
    const video = remoteVideoRef.current
    const audio = remoteAudioRef.current
    if (!video || !stream) return

    video.srcObject = stream
    video.autoplay = true
    video.playsInline = true
    video.muted = false

    if (audio) {
      audio.srcObject = stream
      audio.autoplay = true
      audio.playsInline = true
      audio.muted = false
    }

    const startPlayback = async () => {
      const videoStarted = await playMediaElement(video, { muted: false }) || await playMediaElement(video, { muted: true })
      const audioStarted = await playMediaElement(audio, { muted: false })

      if (videoStarted) {
        setStreamActive(true)
        streamRetryCountRef.current = 0
        waitingForOfferRef.current = false
      } else {
        setStreamActive(false)
      }

      return videoStarted || audioStarted
    }

    video.onloadedmetadata = startPlayback
    video.oncanplay = startPlayback
    await startPlayback()
  }

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
        waitingForOfferRef.current = false
        requestCandidateStream({ resetAttempts: true })
      }
    })
    socket.on('room-state', ({ hasCandidate }) => {
      setCandidatePresent(hasCandidate)
      if (hasCandidate) {
        addLog('system', 'Candidate in room.')
        requestCandidateStream({ resetAttempts: true })
      }
    })
    socket.on('peer-left', ({ role }) => {
      if (role === 'candidate') {
        setCandidatePresent(false)
        setStreamActive(false)
        streamRetryCountRef.current = 0
        waitingForOfferRef.current = false
        addLog('system', 'Candidate left.')
      }
    })

    // WebRTC
    socket.on('offer', async ({ from, offer }) => {
      waitingForOfferRef.current = false
      const pc = await createPC(from)
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

    // Candidate's WebRTC answer for HR's two-way media offer
    socket.on('candidate-answer', async ({ from, answer }) => {
      if (hrSpeakPcRef.current?.signalingState === 'have-local-offer') {
        try {
          await hrSpeakPcRef.current.setRemoteDescription(new RTCSessionDescription(answer))
          console.log('[WebRTC] HR received candidate answer — two-way connection establishing')
        } catch (err) {
          console.error('[WebRTC] Failed to set candidate answer:', err)
        }
      }
    })

    // ICE candidates from candidate for the HR speak peer connection
    socket.on('hr-ice-candidate', async ({ candidate }) => {
      if (hrSpeakPcRef.current && candidate) {
        try {
          await hrSpeakPcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.warn('[WebRTC] Failed to add HR ICE candidate:', err)
        }
      }
    })

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
    const handleProctoringAlert = (payload = {}) => {
      const warning = typeof payload === 'string'
        ? payload
        : payload.warning || payload.message || payload.alert || payload.text
      const ts = new Date().toLocaleTimeString()
      appendAlert(warning, ts)
      applyAlertToProctoringState(warning)
    }
    socket.on('proctoring-alert', handleProctoringAlert)

    // Proctoring state — mood + objects
    const handleProctoringState = (data = {}) => {
      const nextMood = extractMood(data)
      const nextObjects = extractObjects(data)
      const warnings = extractWarnings(data)

      if (nextMood) setCandidateMood(nextMood)
      if (nextObjects) setCandidateObjects(nextObjects)
      warnings.forEach(warning => applyAlertToProctoringState(warning))
    }
    socket.on('proctoring-state', handleProctoringState)
    socket.on('proctoring-update', handleProctoringState)
    socket.on('candidate-mood', handleProctoringState)
    socket.on('object-detection', handleProctoringState)

    // Custom question spoken confirmation
    socket.on('hr-question-spoken', () => { addLog('system', 'Custom question delivered to candidate.') })

    // End
    socket.on('interview-ended', () => { setSessionEnded(true); addLog('system', 'Interview ended.') })

    return () => {
      clearInterval(streamRetryTimerRef.current)
      socket.disconnect()
      peerRef.current?.close()
      hrSpeakPcRef.current?.close()
      localStreamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [campaignId, currentUser])

  useEffect(() => {
    clearInterval(streamRetryTimerRef.current)
    if (!candidatePresent || streamActive) return

    if (Date.now() - lastStreamRequestAtRef.current > 1000) {
      requestCandidateStream()
    }

    streamRetryTimerRef.current = setInterval(() => {
      if (!candidatePresent || streamActive) return
      if (streamRetryCountRef.current >= STREAM_RETRY_LIMIT) return
      if (Date.now() - lastStreamRequestAtRef.current < STREAM_RETRY_INTERVAL_MS) return
      waitingForOfferRef.current = false
      requestCandidateStream()
    }, STREAM_RETRY_INTERVAL_MS)

    return () => clearInterval(streamRetryTimerRef.current)
  }, [candidatePresent, streamActive, campaignId])

  function addLog(type, text) {
    setChatLog(prev => [...prev, { type, text, ts: new Date().toLocaleTimeString() }])
  }

  const remotePeerIdRef = useRef(null)
  const hrSpeakPcRef = useRef(null)
  const hrSpeakRemotePeerIdRef = useRef(null)

  async function createPC(remotePeerId) {
    peerRef.current?.close()
    remotePeerIdRef.current = remotePeerId
    const config = await buildRtcConfigAsync()
    const pc = new RTCPeerConnection(config)
    peerRef.current = pc
    pc.onicecandidate = ({ candidate }) => { if (candidate) socketRef.current?.emit('ice-candidate', { to: remotePeerId, candidate }) }
    pc.ontrack = ({ streams }) => {
      if (remoteVideoRef.current && streams[0]) {
        const [videoTrack] = streams[0].getVideoTracks()
        attachRemoteStream(streams[0])
        if (videoTrack) {
          videoTrack.onunmute = () => setStreamActive(true)
          videoTrack.onended = () => setStreamActive(false)
          videoTrack.onmute = () => setStreamActive(false)
        }
      }
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setStreamActive(true)
        streamRetryCountRef.current = 0
        waitingForOfferRef.current = false
      }
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setStreamActive(false)
        waitingForOfferRef.current = false
      }
    }
    return pc
  }

  useEffect(() => {
    function resumeRemoteMedia() {
      playMediaElement(remoteVideoRef.current, { muted: false }).catch?.(() => {})
      playMediaElement(remoteAudioRef.current, { muted: false }).catch?.(() => {})
    }

    window.addEventListener('pointerdown', resumeRemoteMedia)
    window.addEventListener('keydown', resumeRemoteMedia)
    return () => {
      window.removeEventListener('pointerdown', resumeRemoteMedia)
      window.removeEventListener('keydown', resumeRemoteMedia)
    }
  }, [])

  async function enableMic() {
    try {
      // Acquire local audio + video for two-way communication with candidate
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      localStreamRef.current = stream

      // Find the candidate's socket ID from the room
      const candidateSocketId = remotePeerIdRef.current
      if (!candidateSocketId) {
        addLog('system', 'No candidate connection found for two-way media.')
        return
      }

      // Close any previous HR speak peer connection
      hrSpeakPcRef.current?.close()

      // Create a new dedicated peer connection for HR → candidate audio/video
      const config = await buildRtcConfigAsync()
      const pc = new RTCPeerConnection(config)
      hrSpeakPcRef.current = pc
      hrSpeakRemotePeerIdRef.current = candidateSocketId

      // Add HR's local tracks (audio + video) to the connection
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      // Exchange ICE candidates via dedicated hr-ice-candidate event
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          socketRef.current?.emit('hr-ice-candidate', { to: candidateSocketId, candidate })
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          console.log('[WebRTC] HR speak peer connection established')
        }
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.warn('[WebRTC] HR speak peer connection', pc.connectionState)
          addLog('system', 'Two-way connection lost.')
        }
      }

      // Create and send offer to candidate via hr-offer signaling event
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socketRef.current?.emit('hr-offer', { to: candidateSocketId, offer })
      console.log('[WebRTC] HR sent offer to candidate for two-way media')
      addLog('system', 'Camera & microphone enabled — sending audio/video to candidate.')
    } catch (err) {
      console.error('[WebRTC] Failed to enable mic/camera:', err)
      addLog('system', 'Microphone/camera unavailable.')
    }
  }

  /* ═══════════════════ HR CONTROLS ═══════════════════ */
  function requestToSpeak() {
    socketRef.current?.emit('hr-speak-request', { roomId: campaignId })
    setSpeakRequested(true)
    addLog('hr', 'Requested to speak…')
  }

  function endSpeaking() {
    setSpeaking(false); setSpeakRequested(false)
    // Close the HR speak peer connection
    hrSpeakPcRef.current?.close()
    hrSpeakPcRef.current = null
    hrSpeakRemotePeerIdRef.current = null
    // Stop local media tracks acquired for two-way communication
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
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
    <div className="page-enter app-page observer-room" style={S.page}>
      {/* ═══ LEFT: Video + Controls ═══ */}
      <div style={S.leftPanel} className="observer-room__sidebar">
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
          <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
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
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '11px' }} onClick={() => { navigator.clipboard.writeText(interviewUrl(campaignId)); toast.info('Copied!') }}>
            📋 Copy Candidate Link
          </button>
        </div>

        <button className="btn btn-ghost" style={{ margin: '0 16px 12px', fontSize: '11px' }} onClick={() => navigate('/hr')}>← Dashboard</button>
      </div>

      {/* ═══ RIGHT: Tabs ═══ */}
      <div style={S.rightPanel} className="observer-room__main">
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

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }} className="observer-room__content">

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
                    {interviewUrl(campaignId)}
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

function normalizeExpressionLabel(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const canonical = {
    fearful: 'Nervous',
    disgusted: 'Disgusted',
    happy: 'Happy',
    sad: 'Sad',
    angry: 'Angry',
    surprised: 'Surprised',
    nervous: 'Nervous',
    neutral: 'Neutral',
  }
  return canonical[raw.toLowerCase()] || raw.charAt(0).toUpperCase() + raw.slice(1)
}

function normalizeMood(input) {
  if (!input) return null
  if (typeof input === 'string') {
    return { expression: normalizeExpressionLabel(input), confidence: 100 }
  }

  const expression = normalizeExpressionLabel(
    input.expression || input.mood || input.label || input.name || input.state
  )
  if (!expression) return null

  const numericConfidence = Number(
    input.confidence ?? input.score ?? input.probability ?? input.percent ?? input.value ?? 100
  )
  const confidence = numericConfidence <= 1 ? Math.round(numericConfidence * 100) : Math.round(numericConfidence)

  return { expression, confidence: Number.isFinite(confidence) ? confidence : 100 }
}

function normalizeObjects(input) {
  if (!Array.isArray(input)) return []
  return input
    .map((item) => {
      if (typeof item === 'string') return { name: item, confidence: 100 }
      const name = item?.name || item?.label || item?.class || item?.object
      if (!name) return null
      const numericConfidence = Number(item.confidence ?? item.score ?? item.probability ?? 100)
      const confidence = numericConfidence <= 1 ? Math.round(numericConfidence * 100) : Math.round(numericConfidence)
      return {
        name,
        confidence: Number.isFinite(confidence) ? confidence : 100,
      }
    })
    .filter(Boolean)
}

function extractMood(data) {
  if (!data || typeof data !== 'object') return null
  return normalizeMood(
    data.mood ||
    data.currentMood ||
    data.candidateMood ||
    data.expression ||
    data.faceExpression ||
    data.state?.mood
  )
}

function extractObjects(data) {
  if (!data || typeof data !== 'object') return []
  const objects = data.objects || data.detectedObjects || data.objectDetection || data.state?.objects
  return normalizeObjects(objects)
}

function extractWarnings(data) {
  if (!data || typeof data !== 'object') return []
  const warnings = data.warnings || data.alerts || data.messages
  if (Array.isArray(warnings)) return warnings.map(item => typeof item === 'string' ? item : item?.warning || item?.message).filter(Boolean)
  const single = data.warning || data.message || data.alert || null
  return single ? [single] : []
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
