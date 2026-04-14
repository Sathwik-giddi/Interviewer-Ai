import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { io } from 'socket.io-client'
import CodeEditor from '../components/CodeEditor'
import TalkingAvatar from '../components/TalkingAvatar'
import VoiceSelector from '../components/VoiceSelector'
import ProctoringAlert from '../components/ProctoringAlert'
import { useToast } from '../components/Toast'
import { apiUrl, getBackendBaseUrl, getSocketServerUrl, interviewUrl } from '../lib/runtimeConfig'
import { buildRtcConfig, getTurnIceServers } from '../utils/turnUtils'
import { getSelectedCandidatePairInfo, hasTurnConfig } from '../lib/webrtcConfig'

const BACKEND = getBackendBaseUrl()
const SIGNAL  = getSocketServerUrl()

function createDraftSessionId() {
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function InterviewRoom() {
  const { roomId } = useParams()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  // Guest mode — works without Firebase auth
  const guestId = useRef(`guest-${Math.random().toString(36).slice(2, 10)}`)
  const userId  = currentUser?.uid || guestId.current

  // ── State ──
  const [phase, setPhase]               = useState('setup')
  const [candidateName, setCandidateName] = useState('')
  const [candidateEmail, setCandidateEmail] = useState(currentUser?.email || '')
  const [candidatePhone, setCandidatePhone] = useState('')
  const [candidateCustomId, setCandidateCustomId] = useState('')
  const [jobTitle, setJobTitle]           = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [resumeFile, setResumeFile]       = useState(null)
  const [questions, setQuestions]         = useState([])
  const [qIndex, setQIndex]               = useState(0)
  const [answers, setAnswers]             = useState([])
  const [codeValue, setCodeValue]         = useState('')
  const [codeLang, setCodeLang]           = useState('javascript')
  const [textAnswer, setTextAnswer]       = useState('')
  const [recording, setRecording]         = useState(false)
  const [transcribing, setTranscribing]   = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [aiSpeaking, setAiSpeaking]       = useState(false)
  const [sessionId, setSessionId]         = useState(() => createDraftSessionId())
  const [matchScore, setMatchScore]       = useState(null)
  const [parsedResume, setParsedResume]   = useState(null)
  const [parsingResume, setParsingResume] = useState(false)
  const [timer, setTimer]                 = useState(0)
  const [evaluation, setEvaluation]       = useState(null)
  const [observerRoomId, setObserverRoomId] = useState(roomId)
  const [campaignId, setCampaignId]       = useState('')
  const [sessionStartedAt, setSessionStartedAt] = useState('')
  const [candidateId, setCandidateId] = useState('')
  const [linkToken, setLinkToken] = useState('')
  const [linkId, setLinkId] = useState('')
  const [prefillInfo, setPrefillInfo] = useState(null)
  const [prefillChecked, setPrefillChecked] = useState(false)
  const [resumeDraft, setResumeDraft] = useState(null)
  const [questionDurations, setQuestionDurations] = useState({})
  const [pagesVisited, setPagesVisited] = useState([])

  // Proctoring
  const [procWarnings, setProcWarnings]   = useState([])
  const [procHistory, setProcHistory]     = useState([])
  const [faceApiReady, setFaceApiReady]   = useState(false)
  const [cocoReady, setCocoReady]         = useState(false)
  const [cameraReady, setCameraReady]     = useState(false)
  const [currentMood, setCurrentMood]     = useState(null)
  const [detectedObjects, setDetectedObjects] = useState([])
  const [procModal, setProcModal]         = useState(null)   // { title, message, severity }
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const beepCtxRef = useRef(null)

  // Voice settings
  const [voiceLang, setVoiceLang] = useState('en-IN')
  const [voiceGender, setVoiceGender] = useState('female')
  const [interviewDisqualified, setInterviewDisqualified] = useState(false)

  // Refs for stable access in async functions (avoid stale closures)
  const voiceLangRef = useRef(voiceLang)
  const voiceGenderRef = useRef(voiceGender)
  const answersRef = useRef(answers)
  const sessionIdRef = useRef(sessionId)
  const candidateIdRef = useRef(candidateId)
  const phaseRef = useRef(phase)
  const qIndexRef = useRef(qIndex)
  const questionDurationsRef = useRef(questionDurations)
  const currentQuestionStartedAtRef = useRef(null)
  const actionQueueRef = useRef([])
  const actionFlushTimerRef = useRef(null)
  const progressFlushTimerRef = useRef(null)
  const fieldSnapshotRef = useRef({
    candidateName: '',
    candidateEmail: currentUser?.email || '',
    candidatePhone: '',
    candidateCustomId: '',
    jobTitle: '',
    jobDescription: '',
  })
  const answerDraftRef = useRef('')
  const codeDraftRef = useRef('')
  useEffect(() => { voiceLangRef.current = voiceLang }, [voiceLang])
  useEffect(() => { voiceGenderRef.current = voiceGender }, [voiceGender])
  useEffect(() => { answersRef.current = answers }, [answers])
  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])
  useEffect(() => { candidateIdRef.current = candidateId }, [candidateId])
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { qIndexRef.current = qIndex }, [qIndex])
  useEffect(() => { questionDurationsRef.current = questionDurations }, [questionDurations])

  // HR Intervention
  const [hrSpeakRequest, setHrSpeakRequest] = useState(false)
  const [hrSpeaking, setHrSpeaking]       = useState(false)

  // HR custom question
  const [hrCustomQuestion, setHrCustomQuestion] = useState(null)

  // Room lock
  const [roomLocked, setRoomLocked] = useState(false)

  // Dialogue history (scrollable Q&A transcript)
  const [dialogue, setDialogue] = useState([])
  const dialogueEndRef = useRef(null)

  // Socket
  const [socketConnected, setSocketConnected] = useState(false)

  // Refs
  const localVideoRef    = useRef(null)
  const localStreamRef   = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef        = useRef([])
  const audioRef         = useRef(null)
  const faceIntervalRef  = useRef(null)
  const socketRef        = useRef(null)
  const peerRef          = useRef(null)
  const timerRef         = useRef(null)
  const remotePeerIdRef  = useRef(null)
  const relayFallbackAttemptedRef = useRef(false)
  const activeRelayModeRef = useRef(false)

  // HR two-way audio/video peer connection (separate from the main candidate→HR stream)
  const hrSpeakPcRef = useRef(null)
  const hrSpeakPendingCandidatesRef = useRef([])
  const hrVideoRef = useRef(null)

  function getCurrentPageUrl() {
    return typeof window !== 'undefined' ? window.location.href : `/interview/${roomId}`
  }

  function addPageVisit(pageUrl = getCurrentPageUrl()) {
    setPagesVisited(prev => prev.includes(pageUrl) ? prev : [...prev, pageUrl])
  }

  function enqueueAction(action) {
    const item = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      candidate_id: candidateIdRef.current || candidateId || userId,
      session_id: sessionIdRef.current || sessionId,
      timestamp: new Date().toISOString(),
      page_url: getCurrentPageUrl(),
      ...action,
    }
    if (!item.session_id) return
    actionQueueRef.current.push(item)
    if (actionFlushTimerRef.current) clearTimeout(actionFlushTimerRef.current)
    actionFlushTimerRef.current = setTimeout(() => flushActions(), 1200)
  }

  async function flushActions() {
    if (!actionQueueRef.current.length) return
    const batch = [...actionQueueRef.current]
    actionQueueRef.current = []
    try {
      await fetch(apiUrl('/api/candidate/actions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions: batch }),
        keepalive: true,
      })
    } catch {
      actionQueueRef.current = [...batch, ...actionQueueRef.current]
    }
  }

  function buildProgressPayload(statusOverride = '') {
    return {
      session_id: sessionIdRef.current || sessionId,
      candidate_id: candidateIdRef.current || candidateId || userId,
      room_id: roomId,
      campaign_id: campaignId,
      link_id: linkId,
      observer_room_id: observerRoomId,
      status: statusOverride || (phaseRef.current === 'ended' ? 'completed' : phaseRef.current === 'interview' ? 'in-progress' : 'draft'),
      fields: {
        candidateName: candidateName.trim(),
        candidateEmail: candidateEmail.trim(),
        candidatePhone: candidatePhone.trim(),
        candidateCustomId: candidateCustomId.trim(),
        jobTitle: jobTitle.trim(),
        jobDescription: jobDescription.trim(),
      },
      questions,
      answers,
      current_index: qIndex,
      match_score: matchScore,
      parsed_resume: parsedResume,
      question_durations: questionDurationsRef.current,
      pages_visited: pagesVisited,
      duration: timer,
      violations: procHistory.map(h => ({ type: h.type, timestamp: h.ts, details: h.msg })),
      started_at: sessionStartedAt || new Date().toISOString(),
      evaluation,
    }
  }

  function scheduleProgressPersist(statusOverride = '') {
    if (!prefillChecked) return
    if (progressFlushTimerRef.current) clearTimeout(progressFlushTimerRef.current)
    progressFlushTimerRef.current = setTimeout(() => persistProgress(statusOverride), 1500)
  }

  async function persistProgress(statusOverride = '') {
    const payload = buildProgressPayload(statusOverride)
    if (!payload.session_id) return
    try {
      const res = await fetch(apiUrl('/api/candidate/progress'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.candidateId && !candidateIdRef.current) setCandidateId(data.candidateId)
      }
    } catch {}
  }

  function setTrackedField(fieldName, nextValue, setter) {
    const oldValue = fieldSnapshotRef.current[fieldName] ?? ''
    fieldSnapshotRef.current[fieldName] = nextValue
    setter(nextValue)
    if (oldValue !== nextValue) {
      enqueueAction({
        action_type: 'input_change',
        field_name: fieldName,
        old_value: oldValue,
        new_value: nextValue,
        message: `Changed ${fieldName} at ${new Date().toLocaleTimeString()}`,
      })
    }
  }

  function markFieldBlur(fieldName, value) {
    enqueueAction({
      action_type: 'blur',
      field_name: fieldName,
      new_value: value,
      message: `Reviewed ${fieldName} at ${new Date().toLocaleTimeString()}`,
    })
  }

  function captureCurrentQuestionDuration() {
    const startedAt = currentQuestionStartedAtRef.current
    const currentQuestion = questions[qIndexRef.current]
    if (!startedAt || !currentQuestion) return
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000))
    const key = currentQuestion.id || `q-${qIndexRef.current + 1}`
    setQuestionDurations(prev => {
      const updated = { ...prev, [key]: (prev[key] || 0) + elapsedSeconds }
      questionDurationsRef.current = updated
      return updated
    })
  }

  function resumePreviousDraft(draft) {
    if (!draft) return
    setSessionId(draft.sessionId || createDraftSessionId())
    setCandidateId(draft.candidateId || candidateIdRef.current || '')
    setObserverRoomId(draft.observerRoomId || roomId)
    setCampaignId(draft.campaignId || '')
    setQuestions(draft.questions || [])
    setAnswers(draft.answers || [])
    setQIndex(Math.min(draft.currentIndex || 0, Math.max((draft.questions || []).length - 1, 0)))
    setMatchScore(draft.matchScore ?? null)
    setParsedResume(draft.parsedResume || null)
    setTimer(draft.duration || 0)
    setQuestionDurations(draft.questionDurations || {})
    setPagesVisited(draft.pagesVisited || [])
    setSessionStartedAt(draft.startedAt || new Date().toISOString())
    setResumeDraft(draft)
    setEvaluation(draft.evaluation || null)
    setPhase((draft.questions || []).length ? 'interview' : 'setup')
    enqueueAction({
      action_type: 'navigation',
      field_name: 'resume_draft',
      message: `Resumed previous session at ${new Date().toLocaleTimeString()}`,
      metadata: { restoredQuestionIndex: draft.currentIndex || 0 },
    })
    if ((draft.questions || []).length) {
      setTimeout(() => speakQuestion(Math.min(draft.currentIndex || 0, Math.max((draft.questions || []).length - 1, 0)), draft.questions || []), 400)
    }
  }

  /* ═══════════════════ CAMERA ═══════════════════ */
  useEffect(() => {
    startCamera()
    return () => {
      if (progressFlushTimerRef.current) clearTimeout(progressFlushTimerRef.current)
      if (actionFlushTimerRef.current) clearTimeout(actionFlushTimerRef.current)
      captureCurrentQuestionDuration()
      flushActions()
      persistProgress(phaseRef.current === 'ended' ? 'completed' : phaseRef.current === 'interview' ? 'in-progress' : 'draft')
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      clearInterval(faceIntervalRef.current)
      clearInterval(timerRef.current)
      // Stop any active recording
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      // Stop audio playback
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
      window.speechSynthesis?.cancel()
      // Close peer connection
      peerRef.current?.close()
      // Disconnect socket
      socketRef.current?.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!currentUser?.email || candidateEmail) return
    setCandidateEmail(currentUser.email)
    fieldSnapshotRef.current.candidateEmail = currentUser.email
  }, [currentUser?.email])

  useEffect(() => {
    const token = new URLSearchParams(location.search).get('token') || ''
    setLinkToken(token)
  }, [location.search])

  useEffect(() => {
    addPageVisit()
    enqueueAction({
      action_type: 'view',
      field_name: 'assessment',
      message: `Viewed assessment page at ${new Date().toLocaleTimeString()}`,
    })
  }, [])

  useEffect(() => {
    async function loadPrefill() {
      if (!linkToken) {
        setPrefillChecked(true)
        return
      }
      try {
        const res = await fetch(apiUrl(`/api/candidate/lookup?token=${encodeURIComponent(linkToken)}`))
        if (res.status === 404) {
          setPrefillChecked(true)
          return
        }
        if (!res.ok) throw new Error('Failed to load previous candidate data')
        const data = await res.json()
        const fields = data.fields || {}
        setCandidateId(data.candidateId || '')
        setCandidateName(fields.candidateName || '')
        setCandidateEmail(fields.candidateEmail || currentUser?.email || '')
        setCandidatePhone(fields.candidatePhone || '')
        setCandidateCustomId(fields.candidateCustomId || '')
        setJobTitle(fields.jobTitle || data.link?.jobTitle || '')
        setJobDescription(fields.jobDescription || '')
        setLinkId(data.link?.linkId || '')
        setCampaignId(data.link?.campaignId || '')
        setPrefillInfo({
          message: data.message,
          lastUpdatedAt: data.lastUpdatedAt,
        })
        fieldSnapshotRef.current = {
          candidateName: fields.candidateName || '',
          candidateEmail: fields.candidateEmail || currentUser?.email || '',
          candidatePhone: fields.candidatePhone || '',
          candidateCustomId: fields.candidateCustomId || '',
          jobTitle: fields.jobTitle || data.link?.jobTitle || '',
          jobDescription: fields.jobDescription || '',
        }
        if (data.draft) {
          setResumeDraft(data.draft)
          setSessionId(data.draft.sessionId || createDraftSessionId())
          setQuestionDurations(data.draft.questionDurations || {})
          setPagesVisited(data.draft.pagesVisited || [])
          setSessionStartedAt(data.draft.startedAt || '')
        }
      } catch (err) {
        toast.warning(err.message || 'Could not load previous submission data.')
      } finally {
        setPrefillChecked(true)
      }
    }
    loadPrefill()
  }, [linkToken])

  useEffect(() => {
    const flushPending = () => {
      captureCurrentQuestionDuration()
      flushActions()
      persistProgress(phaseRef.current === 'ended' ? 'completed' : phaseRef.current === 'interview' ? 'in-progress' : 'draft')
    }
    window.addEventListener('beforeunload', flushPending)
    return () => window.removeEventListener('beforeunload', flushPending)
  }, [])

  useEffect(() => {
    if (phase !== 'interview' || !questions[qIndex]) {
      currentQuestionStartedAtRef.current = null
      return
    }
    currentQuestionStartedAtRef.current = Date.now()
    enqueueAction({
      action_type: 'navigation',
      field_name: `question_${qIndex + 1}`,
      message: `Opened question #${qIndex + 1} at ${new Date().toLocaleTimeString()}`,
    })
  }, [phase, qIndex, questions.length])

  useEffect(() => {
    if (!prefillChecked) return
    scheduleProgressPersist()
  }, [
    prefillChecked,
    candidateName,
    candidateEmail,
    candidatePhone,
    candidateCustomId,
    jobTitle,
    jobDescription,
    qIndex,
    answers,
    questions,
    matchScore,
    parsedResume,
    phase,
    questionDurations,
    pagesVisited,
  ])

  useEffect(() => {
    addPageVisit(`${getCurrentPageUrl()}::${phase}`)
  }, [phase])

  useEffect(() => {
    if (phase !== 'interview') return undefined
    const interval = setInterval(() => {
      persistProgress('in-progress')
    }, 15000)
    return () => clearInterval(interval)
  }, [phase, roomId])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
      setCameraReady(true)
      if (!hasTurnConfig()) {
        console.warn('[WebRTC] TURN is not configured. Cross-network connectivity will be unreliable.')
      }
    } catch {
      toast.error('Camera/mic access denied. Please allow permissions and reload.')
    }
  }

  /* ═══════════════════ SOCKET.IO + WEBRTC ═══════════════════ */
  useEffect(() => {
    const socket = io(SIGNAL, { transports: ['websocket', 'polling'], reconnection: true })
    socketRef.current = socket

    socket.on('connect', () => {
      setSocketConnected(true)
      socket.emit('join-room', { roomId, userId, role: 'candidate' })
    })
    socket.on('disconnect', () => setSocketConnected(false))

    // HR observer joined — send them our stream
    socket.on('peer-joined', ({ role, socketId }) => {
      if (role === 'hr') sendStreamToPeer(socketId)
    })

    // HR requested our stream (in case they joined before us or reconnected)
    socket.on('send-stream', ({ to, forceRelay }) => {
      sendStreamToPeer(to, { forceRelay: Boolean(forceRelay) })
    })

    // WebRTC signaling
    socket.on('offer', async ({ from, offer }) => {
      const pc = await createPC(from)
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('answer', { to: from, answer })
    })
    socket.on('answer', async ({ answer }) => {
      if (peerRef.current?.signalingState === 'have-local-offer')
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer))
    })
    socket.on('ice-candidate', ({ candidate }) => {
      peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
    })

    // Room locked — another candidate is already using this link
    socket.on('room-locked', ({ message }) => {
      setRoomLocked(true)
      toast.error(message)
    })

    // HR speak
    socket.on('hr-speak-request', () => { setHrSpeakRequest(true); stopSpeaking() })
    socket.on('hr-speak-end', () => {
      setHrSpeaking(false); setHrSpeakRequest(false); setHrCustomQuestion(null)
      // Close the HR speak peer connection and clean up
      hrSpeakPcRef.current?.close()
      hrSpeakPcRef.current = null
      hrSpeakPendingCandidatesRef.current = []
      if (hrVideoRef.current) hrVideoRef.current.srcObject = null
      console.log('[WebRTC] HR speak peer connection closed')
    })

    // ── HR two-way audio/video signaling ──
    // HR sends a WebRTC offer when they start speaking (after candidate accepts)
    socket.on('hr-offer', async ({ from, offer }) => {
      console.log('[WebRTC] Received HR offer for two-way media')
      try {
        // Close any previous HR speak peer connection
        hrSpeakPcRef.current?.close()
        hrSpeakPendingCandidatesRef.current = []

        const config = await buildRtcConfig()
        const pc = new RTCPeerConnection(config)
        hrSpeakPcRef.current = pc

        // Add candidate's local tracks so HR can see/hear candidate
        const localStream = localStreamRef.current
        if (localStream) {
          localStream.getTracks().forEach(track => pc.addTrack(track, localStream))
        }

        // Handle remote tracks from HR (audio + video)
        pc.ontrack = ({ streams }) => {
          console.log('[WebRTC] Received HR remote tracks')
          if (streams[0]) {
            // Play HR's audio
            if (hrAudioRef.current) {
              hrAudioRef.current.srcObject = streams[0]
              playElement(hrAudioRef.current)
            }
            // Display HR's video in the small overlay
            if (hrVideoRef.current) {
              hrVideoRef.current.srcObject = streams[0]
              playElement(hrVideoRef.current)
            }
          }
        }

        // Exchange ICE candidates via hr-ice-candidate event
        pc.onicecandidate = ({ candidate }) => {
          if (candidate) {
            socket.emit('hr-ice-candidate', { to: from, candidate })
          }
        }

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            console.log('[WebRTC] HR two-way connection established')
          }
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            console.warn('[WebRTC] HR two-way connection', pc.connectionState)
          }
        }

        // Set remote description (HR's offer) and create answer
        await pc.setRemoteDescription(new RTCSessionDescription(offer))

        // Add any pending ICE candidates
        for (const c of hrSpeakPendingCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
        }
        hrSpeakPendingCandidatesRef.current = []

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        // Send answer back to HR via candidate-answer event
        socket.emit('candidate-answer', { to: from, answer })
        console.log('[WebRTC] Sent candidate answer to HR for two-way media')
      } catch (err) {
        console.error('[WebRTC] Failed to handle HR offer:', err)
      }
    })

    // ICE candidates from HR for the two-way peer connection
    socket.on('hr-ice-candidate', async ({ candidate }) => {
      if (hrSpeakPcRef.current?.remoteDescription) {
        try {
          await hrSpeakPcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.warn('[WebRTC] Failed to add HR ICE candidate:', err)
        }
      } else {
        // Buffer until remote description is set
        hrSpeakPendingCandidatesRef.current.push(candidate)
      }
    })

    // HR custom question — HR takes over from AI and asks their own question
    socket.on('hr-custom-question', ({ question }) => {
      setHrCustomQuestion(question)
      setHrSpeaking(false) // Allow candidate to answer
      stopSpeaking()
      setTextAnswer('')
      setCodeValue('')
      toast.info('HR asked a custom question')
    })

    // HR question audio — play TTS audio of HR's custom question
    socket.on('hr-question-audio', ({ audioUrl }) => {
      if (audioUrl && audioRef.current) {
        audioRef.current.src = audioUrl.startsWith('http') ? audioUrl : `${BACKEND}${audioUrl}`
        audioRef.current.play().catch(() => {})
      }
    })

    return () => { socket.disconnect(); peerRef.current?.close() }
  }, [roomId])

  useEffect(() => {
    if (!socketConnected || !socketRef.current || !observerRoomId || observerRoomId === roomId) return
    socketRef.current.emit('register-observer-alias', { observerRoomId, sourceRoomId: roomId })
  }, [observerRoomId, roomId, socketConnected])

  const hrAudioRef = useRef(null)

  async function playElement(element) {
    if (!element) return
    try {
      await element.play()
    } catch {}
  }

  async function maybeLogSelectedPath(pc, contextLabel = 'candidate') {
    const pair = await getSelectedCandidatePairInfo(pc)
    if (!pair) return
    console.info(`[WebRTC] ${contextLabel} connected via ${pair.usesRelay ? 'TURN relay' : 'direct'} (${pair.protocol || 'udp'})`, pair)
  }

  function triggerRelayFallback(reason = 'connection-failed') {
    if (relayFallbackAttemptedRef.current || activeRelayModeRef.current || !remotePeerIdRef.current || !hasTurnConfig()) return
    relayFallbackAttemptedRef.current = true
    console.warn(`[WebRTC] Switching candidate stream to TURN relay after ${reason}`)
    sendStreamToPeer(remotePeerIdRef.current, { forceRelay: true, restartIce: true }).catch(() => {})
  }

  async function createPC(remotePeerId, { forceRelay = false } = {}) {
    peerRef.current?.close()
    remotePeerIdRef.current = remotePeerId
    activeRelayModeRef.current = forceRelay
    const config = await buildRtcConfig({ forceRelay })
    const pc = new RTCPeerConnection(config)
    peerRef.current = pc
    const stream = localStreamRef.current
    if (stream) stream.getTracks().forEach(t => pc.addTrack(t, stream))
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socketRef.current?.emit('ice-candidate', { to: remotePeerId, candidate })
    }
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState
      if (state === 'connected' || state === 'completed') maybeLogSelectedPath(pc, 'candidate')
      if (state === 'failed') triggerRelayFallback('ice-failed')
    }
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      if (state === 'connected') maybeLogSelectedPath(pc, 'candidate')
      if (state === 'failed' || state === 'disconnected') triggerRelayFallback(`pc-${state}`)
    }
    // Play HR's audio when they speak (remote tracks from HR observer)
    pc.ontrack = ({ streams }) => {
      if (streams[0] && hrAudioRef.current) {
        hrAudioRef.current.srcObject = streams[0]
        playElement(hrAudioRef.current)
      }
    }
    return pc
  }

  useEffect(() => {
    function resumeHrAudio() {
      playElement(hrAudioRef.current)
    }

    window.addEventListener('pointerdown', resumeHrAudio)
    window.addEventListener('keydown', resumeHrAudio)
    return () => {
      window.removeEventListener('pointerdown', resumeHrAudio)
      window.removeEventListener('keydown', resumeHrAudio)
    }
  }, [])

  async function getReadyLocalStream() {
    if (localStreamRef.current?.getTracks?.().length) return localStreamRef.current

    for (let i = 0; i < 20; i += 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
      if (localStreamRef.current?.getTracks?.().length) return localStreamRef.current
    }
    return localStreamRef.current
  }

  async function sendStreamToPeer(remotePeerId, { forceRelay = false, restartIce = false } = {}) {
    await getReadyLocalStream()
    const pc = await createPC(remotePeerId, { forceRelay })
    const offer = await pc.createOffer({ iceRestart: restartIce || forceRelay })
    await pc.setLocalDescription(offer)
    socketRef.current?.emit('offer', { to: remotePeerId, offer, forceRelay })
  }

  function acceptHrSpeak() {
    setHrSpeakRequest(false); setHrSpeaking(true)
    socketRef.current?.emit('hr-speak-accept', { roomId })
  }

  /* ═══════════════════ RELAY interview state to HR via socket ═══════════════════ */
  // Emit current question & answer state so HR can see what's happening
  useEffect(() => {
    if (phase !== 'interview' || !socketRef.current) return
    const q = questions[qIndex]
    socketRef.current.emit('interview-state', {
      roomId,
      phase,
      qIndex,
      totalQuestions: questions.length,
      currentQuestion: q?.text || '',
      currentQuestionType: q?.type || 'text',
      currentDifficulty: q?.difficulty || 'intermediate',
      answeredCount: answers.length,
      timer,
      candidateName,
      aiSpeaking,
    })
  }, [phase, qIndex, answers.length, aiSpeaking])

  // Relay text answer live so HR sees what candidate is typing
  useEffect(() => {
    if (phase !== 'interview' || !socketRef.current) return
    const debounce = setTimeout(() => {
      const q = questions[qIndex]
      socketRef.current.emit('candidate-typing', {
        roomId,
        currentAnswer: q?.type === 'code' ? codeValue : textAnswer,
        answerType: q?.type || 'text',
      })
    }, 500)
    return () => clearTimeout(debounce)
  }, [textAnswer, codeValue, phase, qIndex])

  useEffect(() => {
    if (phase !== 'interview') return
    const nextValue = textAnswer.trim()
    const previousValue = answerDraftRef.current
    if (nextValue === previousValue) return
    const timeout = setTimeout(() => {
      enqueueAction({
        action_type: 'input_change',
        field_name: `answer_text_${qIndex + 1}`,
        old_value: previousValue,
        new_value: nextValue,
        message: `Edited text answer for question #${qIndex + 1} at ${new Date().toLocaleTimeString()}`,
      })
      answerDraftRef.current = nextValue
    }, 700)
    return () => clearTimeout(timeout)
  }, [textAnswer, phase, qIndex])

  useEffect(() => {
    if (phase !== 'interview') return
    const nextValue = codeValue.trim()
    const previousValue = codeDraftRef.current
    if (nextValue === previousValue) return
    const timeout = setTimeout(() => {
      enqueueAction({
        action_type: 'input_change',
        field_name: `answer_code_${qIndex + 1}`,
        old_value: previousValue,
        new_value: nextValue,
        message: `Edited code answer for question #${qIndex + 1} at ${new Date().toLocaleTimeString()}`,
      })
      codeDraftRef.current = nextValue
    }, 900)
    return () => clearTimeout(timeout)
  }, [codeValue, phase, qIndex])

  /* ═══════════════════ FACE-API PROCTORING + EXPRESSIONS ═══════════════════ */
  useEffect(() => {
    if (window.faceapi) { setFaceApiReady(true); return }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'
    script.onload = async () => {
      try {
        await Promise.all([
          window.faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          window.faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          window.faceapi.nets.faceExpressionNet.loadFromUri('/models'),
        ])
        setFaceApiReady(true)
      } catch { setFaceApiReady(false) }
    }
    script.onerror = () => setFaceApiReady(false)
    document.head.appendChild(script)
  }, [])

  /* ═══════════════════ COCO-SSD OBJECT DETECTION ═══════════════════ */
  useEffect(() => {
    if (window.cocoSsd) { setCocoReady(true); return }
    const tf = document.createElement('script')
    tf.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js'
    tf.onload = () => {
      const coco = document.createElement('script')
      coco.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js'
      coco.onload = async () => {
        try {
          window.cocoSsdModel = await window.cocoSsd.load()
          setCocoReady(true)
        } catch { setCocoReady(false) }
      }
      coco.onerror = () => setCocoReady(false)
      document.head.appendChild(coco)
    }
    tf.onerror = () => setCocoReady(false)
    document.head.appendChild(tf)
  }, [])

  useEffect(() => {
    if (phase !== 'interview' || !faceApiReady || !window.faceapi) return
    faceIntervalRef.current = setInterval(runProctoring, 2500)
    return () => clearInterval(faceIntervalRef.current)
  }, [phase, faceApiReady])

  async function runProctoring() {
    const video = localVideoRef.current
    if (!video) return
    const warnings = []
    let nextMood = null
    let nextObjects = []

    // ── Face detection + expressions ──
    if (window.faceapi) {
      try {
        const detections = await window.faceapi.detectAllFaces(
          video, new window.faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceExpressions()

        if (detections.length === 0)
          warnings.push({ type: 'no-face', msg: 'No face detected — stay in frame!' })
        if (detections.length > 1)
          warnings.push({ type: 'multi-face', msg: `${detections.length} faces detected — only one person allowed!` })
        if (detections.length === 1) {
          const det = detections[0]
          const lm = det.landmarks
          const eyeCenter = (lm.getLeftEye()[0].x + lm.getRightEye()[3].x) / 2
          if (Math.abs(lm.getNose()[3].x - eyeCenter) > 30)
            warnings.push({ type: 'gaze', msg: 'Gaze deviation — look at the screen.' })

          // Expression/mood detection
          if (det.expressions) {
            const exprs = det.expressions
            const sorted = Object.entries(exprs).sort((a, b) => b[1] - a[1])
            const [topExpr, topConf] = sorted[0]
            const moodMap = { happy: 'Happy', sad: 'Sad', angry: 'Angry', fearful: 'Nervous', disgusted: 'Disgusted', surprised: 'Surprised', neutral: 'Neutral' }
            const mood = { expression: moodMap[topExpr] || topExpr, confidence: Math.round(topConf * 100) }
            nextMood = mood
            setCurrentMood(mood)

            // Alert on concerning expressions
            if (['fearful', 'angry', 'disgusted'].includes(topExpr) && topConf > 0.6) {
              warnings.push({ type: 'mood', msg: `Expression alert: ${moodMap[topExpr]} (${mood.confidence}% confidence)` })
            }
          }
        }
      } catch { /* face-api not ready */ }
    }

    // ── Object detection (COCO-SSD) ──
    if (window.cocoSsdModel && video.readyState >= 2) {
      try {
        const predictions = await window.cocoSsdModel.detect(video)
        const suspiciousObjects = ['cell phone', 'book', 'laptop', 'remote', 'tablet']
        const found = predictions.filter(p => suspiciousObjects.some(o => p.class.toLowerCase().includes(o)) && p.score > 0.5)
        const personCount = predictions.filter(p => p.class === 'person' && p.score > 0.5).length

        nextObjects = found.map(f => ({ name: f.class, confidence: Math.round(f.score * 100) }))
        setDetectedObjects(nextObjects)

        if (found.length > 0) {
          const objNames = [...new Set(found.map(f => f.class))].join(', ')
          warnings.push({ type: 'object', msg: `Foreign object detected: ${objNames}` })
        }
        if (personCount > 1) {
          warnings.push({ type: 'multi-person', msg: `${personCount} people detected by object detection` })
        }
      } catch { /* coco-ssd not ready */ }
    }

    setProcWarnings(warnings)
    if (warnings.length > 0) {
      const ts = new Date().toLocaleTimeString()
      setProcHistory(prev => [...warnings.map(w => ({ ...w, ts })), ...prev].slice(0, 50))
      warnings.forEach(w => socketRef.current?.emit('proctoring-alert', { roomId, warning: w.msg }))

      // Trigger ProctoringAlert component for critical warnings
      const critical = warnings.find(w => ['no-face', 'multi-face', 'multi-person'].includes(w.type))
      const objectWarn = warnings.find(w => w.type === 'object')
      if (critical && window.__proctoringTrigger) {
        window.__proctoringTrigger(
          critical.type === 'no-face' ? 'faceMissing' : 'multipleFaces',
          critical.type === 'no-face' ? 'Face Not Detected' : 'Multiple Faces Detected',
          critical.msg,
          critical.type === 'multi-face' ? 'danger' : 'warning'
        )
      } else if (objectWarn && window.__proctoringTrigger) {
        window.__proctoringTrigger('foreignObject', 'Suspicious Object Detected', objectWarn.msg, 'danger')
      }
    }

    // Relay mood + objects to HR
    if (socketRef.current) {
      socketRef.current.emit('proctoring-state', {
        roomId,
        mood: nextMood,
        objects: nextObjects,
        warnings: warnings.map(w => w.msg),
      })
    }
  }

  /* ═══════════════════ TIMER ═══════════════════ */
  useEffect(() => {
    if (phase === 'interview') timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  function fmtTime(s) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}` }

  /* ═══════════════════ TEXT-TO-SPEECH ═══════════════════ */
  function stopSpeaking() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
    window.speechSynthesis?.cancel()
    setAiSpeaking(false)
  }

  async function speakQuestion(idx, pool) {
    const qs = pool ?? questions
    if (!qs[idx]) return
    setAiSpeaking(true)

    // Add to dialogue history
    setDialogue(prev => [...prev, { role: 'ai', text: qs[idx].text, ts: new Date().toLocaleTimeString(), qNum: idx + 1 }])
    setTimeout(() => dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

    // Notify HR what AI is saying
    socketRef.current?.emit('ai-speaking', { roomId, question: qs[idx].text, qIndex: idx })

    // Try backend TTS (Sarvam AI → gTTS fallback)
    try {
      const res = await fetch(apiUrl('/api/text-to-speech'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: qs[idx].text, language: voiceLangRef.current, gender: voiceGenderRef.current }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.audio_url && audioRef.current) {
          audioRef.current.src = `${BACKEND}${data.audio_url}`
          audioRef.current.play().catch(() => {})
          return
        }
        // If backend says use browser fallback
        if (data.fallback === 'browser') throw new Error('use browser')
      }
    } catch {}

    // Fallback: browser SpeechSynthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(qs[idx].text)
      u.lang = voiceLangRef.current
      u.rate = 0.95; u.pitch = 1.0
      // Try to find a matching voice
      const voices = window.speechSynthesis.getVoices()
      const match = voices.find(v => v.lang.startsWith(voiceLangRef.current.split('-')[0]))
      if (match) u.voice = match
      u.onend = () => setAiSpeaking(false)
      u.onerror = () => setAiSpeaking(false)
      window.speechSynthesis.speak(u)
    } else {
      setAiSpeaking(false)
    }
  }

  /* ═══════════════════ START INTERVIEW ═══════════════════ */
  async function handleStart(e) {
    e.preventDefault()
    if (!candidateName.trim()) { toast.error('Please enter your name.'); return }
    if (!candidateEmail.trim()) { toast.error('Please enter your email.'); return }
    setPhase('loading')
    enqueueAction({
      action_type: 'submit',
      field_name: 'interview_start',
      message: `Clicked Start Interview at ${new Date().toLocaleTimeString()}`,
    })

    let score = 50
    if (resumeFile) {
      const fd = new FormData()
      fd.append('resume', resumeFile)
      fd.append('job_description', jobDescription)
      try {
        const res = await fetch(apiUrl('/api/parse-resume'), { method: 'POST', body: fd })
        if (res.ok) {
          const data = await res.json()
          score = data.match_score ?? 50
          setMatchScore(score)
          toast.info(`Resume parsed — ${data.skills?.length || 0} skills, ${score}% match.`)
        }
      } catch {}
    }

    const activeSessionId = sessionId || createDraftSessionId()
    const startedAt = sessionStartedAt || new Date().toISOString()
    let resolvedCampaignId = campaignId

    setSessionId(activeSessionId)
    setSessionStartedAt(startedAt)

    try {
      const startRes = await fetch(apiUrl('/api/interview/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSessionId,
          room_id: roomId,
          candidate_id: candidateId || userId,
          candidate_email: candidateEmail.trim(),
          candidate_name: candidateName.trim(),
          candidate_phone: candidatePhone.trim(),
          candidate_custom_id: candidateCustomId.trim(),
          job_title: jobTitle.trim(),
          job_description: jobDescription.trim(),
          match_score: score,
          started_at: startedAt,
          link_token: linkToken,
          link_id: linkId,
          parsed_resume: parsedResume,
          pages_visited: pagesVisited,
          question_durations: questionDurationsRef.current,
        }),
      })
      if (startRes.ok) {
        const startData = await startRes.json()
        if (startData.candidateId) setCandidateId(startData.candidateId)
        if (startData.campaignId) {
          resolvedCampaignId = startData.campaignId
          setCampaignId(startData.campaignId)
        }
        if (startData.observerRoomId) setObserverRoomId(startData.observerRoomId)
      }
    } catch {}

    let selectedQs = []
    try {
      const res = await fetch(apiUrl('/api/select-questions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: resolvedCampaignId || roomId, match_score: score, job_title: jobTitle || 'Software Engineer', job_description: jobDescription }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.questions?.length) selectedQs = data.questions
      }
    } catch {}

    if (!selectedQs.length) selectedQs = getDefaultQuestions()
    setQuestions(selectedQs)
    currentQuestionStartedAtRef.current = Date.now()
    await persistProgress('in-progress')

    await speakQuestion(0, selectedQs)
    setPhase('interview')
    // Auto-start voice recording after AI finishes speaking (voice-first)
    setTimeout(() => { if (selectedQs[0]?.type !== 'code') startRecording() }, 1500)
  }

  function getDefaultQuestions() {
    return [
      { id:'q1', text:'Tell me about yourself and your relevant experience.', difficulty:'basic', type:'text', modelAnswer:'Cover background, key skills, and relevant experience.', rubric:'Clear, concise, relevant.' },
      { id:'q2', text:'Describe a challenging technical problem you solved recently.', difficulty:'basic', type:'text', modelAnswer:'Describe the problem, approach, and outcome.', rubric:'Specific examples, problem-solving process.' },
      { id:'q3', text:'Write a function to check if a string is a palindrome.', difficulty:'intermediate', type:'code', modelAnswer:'function isPalindrome(s) { return s === s.split("").reverse().join(""); }', rubric:'Correct logic, handles edge cases.' },
      { id:'q4', text:'How would you design a real-time chat application? Discuss architecture and scaling.', difficulty:'advanced', type:'text', modelAnswer:'WebSockets, message queue, horizontal scaling, database sharding.', rubric:'System design breadth, trade-offs.' },
      { id:'q5', text:'What is your approach to debugging a production issue under pressure?', difficulty:'intermediate', type:'text', modelAnswer:'Triage severity, check logs, reproduce, isolate, fix, post-mortem.', rubric:'Structured approach, communication.' },
    ]
  }

  /* ═══════════════════ RECORDING ═══════════════════ */
  const recMimeRef = useRef('audio/webm')

  function toggleRecording() { recording ? stopRecording() : startRecording() }

  async function startRecording() {
    // Get audio-only stream (works even if camera stream exists)
    let audioStream = null
    try {
      // Extract audio tracks from existing stream, or request new audio-only stream
      const existingAudio = localStreamRef.current?.getAudioTracks()
      if (existingAudio?.length > 0) {
        audioStream = new MediaStream(existingAudio)
      } else {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      }
    } catch {
      toast.error('Microphone access denied. Please allow mic permissions.')
      return
    }

    chunksRef.current = []

    // Try multiple mimeTypes for cross-browser support
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav',
      '',  // empty = browser default
    ]

    let mr = null
    for (const mime of mimeTypes) {
      try {
        const opts = mime ? { mimeType: mime } : {}
        if (mime && !MediaRecorder.isTypeSupported(mime)) continue
        mr = new MediaRecorder(audioStream, opts)
        recMimeRef.current = mime || 'audio/webm'
        break
      } catch { /* try next */ }
    }

    if (!mr) {
      toast.error('Audio recording not supported on this browser. Please type your answer.')
      return
    }

    mr.ondataavailable = e => e.data.size && chunksRef.current.push(e.data)
    mr.onstop = handleRecordingStop
    mr.start()
    mediaRecorderRef.current = mr
    setRecording(true)
  }

  function stopRecording() { mediaRecorderRef.current?.stop(); setRecording(false) }

  async function handleRecordingStop() {
    setTranscribing(true)
    const mime = recMimeRef.current || 'audio/webm'
    const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm'
    const blob = new Blob(chunksRef.current, { type: mime })
    const fd = new FormData()
    fd.append('audio', blob, `answer.${ext}`)
    try {
      const res = await fetch(apiUrl('/api/transcribe'), { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        if (data.text) setTextAnswer(prev => prev ? prev + ' ' + data.text : data.text)
      }
    } catch { toast.warning('Transcription unavailable — type your answer.') }
    setTranscribing(false)
  }

  /* ═══════════════════ SUBMIT ANSWER ═══════════════════ */
  async function submitAnswer() {
    const q = questions[qIndex]
    if (!q) return
    setSubmitting(true)
    stopSpeaking()
    captureCurrentQuestionDuration()

    const answerText = q.type === 'code' ? codeValue : textAnswer
    const newAnswer = { questionId: q.id || qIndex, question: q.text, answer: answerText, type: q.type || 'text' }
    const updated = [...answers, newAnswer]
    setAnswers(updated)

    // Add answer to dialogue history
    setDialogue(prev => [...prev, { role: 'candidate', text: answerText.substring(0, 500), ts: new Date().toLocaleTimeString(), type: q.type }])
    setTimeout(() => dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

    setTextAnswer(''); setCodeValue('')
    answerDraftRef.current = ''
    codeDraftRef.current = ''

    // Notify HR
    socketRef.current?.emit('answer-submitted', { roomId, qIndex, answer: answerText.substring(0, 200) })
    enqueueAction({
      action_type: 'submit',
      field_name: `question_${qIndex + 1}`,
      old_value: '',
      new_value: answerText,
      message: `Submitted answer for question #${qIndex + 1} at ${new Date().toLocaleTimeString()}`,
      metadata: {
        question: q.text,
        elapsedSeconds: questionDurationsRef.current[q.id || `q-${qIndex + 1}`] || 0,
      },
    })

    // Evaluate in background
    fetch(apiUrl('/api/evaluate-answer-ai'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q.text, answer: answerText, model_answer: q.modelAnswer || '', rubric: q.rubric || '', session_id: sessionId, question_index: qIndex }),
    }).catch(() => {})

    const nextIdx = qIndex + 1
    if (nextIdx >= questions.length) {
      await endInterview(updated)
    } else {
      setQIndex(nextIdx)
      currentQuestionStartedAtRef.current = Date.now()
      await persistProgress('in-progress')
      await speakQuestion(nextIdx)
      // Auto-start recording for text questions (voice-first)
      if (questions[nextIdx]?.type !== 'code') {
        setTimeout(() => startRecording(), 1500)
      }
    }
    setSubmitting(false)
  }

  async function endInterview(finalAnswers) {
    setPhase('ending')
    clearInterval(timerRef.current)
    captureCurrentQuestionDuration()
    socketRef.current?.emit('interview-ended', { roomId, answers: finalAnswers.length })
    enqueueAction({
      action_type: 'submit',
      field_name: 'interview_complete',
      message: `Completed assessment at ${new Date().toLocaleTimeString()}`,
      metadata: {
        answersCount: finalAnswers.length,
        durationSeconds: timer,
      },
    })

    try {
      const res = await fetch(apiUrl('/api/generate-evaluation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          room_id: roomId,
          campaign_id: campaignId,
          candidate_id: candidateId || userId,
          candidate_email: candidateEmail.trim(),
          candidate_phone: candidatePhone.trim(),
          candidate_custom_id: candidateCustomId.trim(),
          match_score: matchScore,
          started_at: sessionStartedAt,
          answers: finalAnswers,
          violations: procHistory.map(h => ({ type: h.type, timestamp: h.ts, details: h.msg })),
          duration: timer,
          candidateName,
          jobTitle,
          jobDescription,
          questions,
          question_durations: questionDurationsRef.current,
          pages_visited: pagesVisited,
          parsed_resume: parsedResume,
          link_token: linkToken,
          link_id: linkId,
          current_index: questions.length,
        }),
      })
      if (res.ok) setEvaluation(await res.json())
    } catch {}

    await persistProgress('completed')
    await flushActions()
    toast.success('Interview complete!')
    setPhase('ended')
  }

  function handleDisqualified() {
    setInterviewDisqualified(true)
    endInterview(answersRef.current)
  }

  // Auto-parse resume when file is selected
  async function handleResumeSelect(file) {
    setResumeFile(file)
    if (!file) { setParsedResume(null); return }
    setParsingResume(true)
    try {
      const fd = new FormData()
      fd.append('resume', file)
      fd.append('job_description', jobDescription || jobTitle)
      const res = await fetch(apiUrl('/api/parse-resume'), { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        setParsedResume(data)
        setMatchScore(data.match_score ?? null)
        toast.info(`Resume parsed — ${data.skills?.length || 0} skills found, ${data.match_score}% match.`)
      }
    } catch {}
    setParsingResume(false)
  }

  function copyLink() {
    const link = typeof window !== 'undefined' ? window.location.href : interviewUrl(roomId)
    navigator.clipboard.writeText(link).then(() => toast.info('Link copied!')).catch(() => {})
  }

  /* ═══════════════════ RENDER ═══════════════════ */
  const currentQ = questions[qIndex]
  const isCode   = currentQ?.type === 'code'

  // ── END SCREEN ──
  if (phase === 'ended') {
    return (
      <div style={S.endScreen} className="page-enter">
        <div style={{ maxWidth: '600px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h1 style={S.endTitle}>INTERVIEW COMPLETE</h1>
            <p style={{ color: 'var(--text-muted)' }}>Duration: {fmtTime(timer)} · {answers.length} questions answered</p>
            {procHistory.length > 0 && <p style={{ fontSize: '13px', color: 'var(--danger)', marginTop: '4px' }}>{procHistory.length} proctoring alert(s) recorded</p>}
          </div>
          {evaluation && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '22px' }}>EVALUATION REPORT</h2>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-head)', fontSize: '40px', color: sColor(evaluation.overallScore) }}>{evaluation.overallScore}</span>
                  <span style={{ color: 'var(--text-muted)' }}>/100</span>
                </div>
              </div>
              <p style={{ fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>{evaluation.summary}</p>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--success)', marginBottom: '8px' }}>Strengths</p>
                  {(evaluation.strengths||[]).map((s,i) => <p key={i} style={{ fontSize: '13px', marginBottom: '4px' }}>+ {s}</p>)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--danger)', marginBottom: '8px' }}>Areas to Improve</p>
                  {(evaluation.areasToImprove||[]).map((s,i) => <p key={i} style={{ fontSize: '13px', marginBottom: '4px' }}>- {s}</p>)}
                </div>
              </div>
              <hr className="divider" style={{ margin: '16px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>Recommendation:</span>
                <span className={`badge badge-${evaluation.recommendation==='hire'?'success':evaluation.recommendation==='consider'?'warning':'danger'}`}>{(evaluation.recommendation||'pending').toUpperCase()}</span>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate(`/report/${sessionId}`)}>View Full Report</button>
            <button className="btn btn-ghost" onClick={() => navigate('/')}>Back to Home</button>
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN ROOM ──
  return (
    <div className="page-enter app-page interview-room" style={S.roomWrapper}>
      {/* ═══ PROCTORING ALERT ═══ */}
      <ProctoringAlert
        sessionId={sessionId}
        backendUrl={BACKEND}
        isActive={phase === 'interview'}
        onDisqualified={handleDisqualified}
        socketRef={socketRef}
        roomId={roomId}
      />
      {/* ═══ LEFT PANEL ═══ */}
      <div style={S.leftPanel} className="interview-room__sidebar">
        <div style={S.statusBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ ...S.dot, background: socketConnected ? '#22c55e' : '#ccc' }} className={socketConnected ? 'pulse' : ''} />
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{socketConnected ? 'LIVE' : 'CONNECTING…'}</span>
          </div>
          {phase === 'interview' && <span style={{ fontSize: '14px', fontFamily: 'monospace' }}>{fmtTime(timer)}</span>}
        </div>

        <div style={S.videoBox}>
          <div style={S.videoLabel}><span>YOUR CAMERA</span>{cameraReady && <span style={{ color: '#22c55e', fontSize: '10px' }}>● LIVE</span>}</div>
          <video ref={localVideoRef} autoPlay muted playsInline style={S.video} />
          {procWarnings.length > 0 && (
            <div style={S.procOverlay}>
              {procWarnings.map((w, i) => (
                <div key={i} style={{ ...S.procWarn, background: w.type === 'multi-face' ? 'rgba(220,38,38,0.95)' : w.type === 'no-face' ? 'rgba(234,179,8,0.95)' : 'rgba(59,130,246,0.9)' }} className="shake">
                  {w.type === 'no-face' && '👤 '}{w.type === 'multi-face' && '⚠️ '}{w.type === 'gaze' && '👁️ '}{w.msg}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={S.videoBox}>
          <div style={S.videoLabel}><span>CANVUE AI</span>{aiSpeaking && <span style={{ color: 'var(--primary)', fontSize: '10px' }}>● SPEAKING</span>}</div>
          <div style={{ ...S.aiAvatar, padding: '12px 0' }}>
            <TalkingAvatar isSpeaking={aiSpeaking} size={90} />
          </div>
          <audio ref={audioRef} onEnded={() => setAiSpeaking(false)} onPlay={() => setAiSpeaking(true)} />
          {/* HR voice audio — plays when HR is speaking via WebRTC */}
          <audio ref={hrAudioRef} autoPlay playsInline />
        </div>

        {/* HR video overlay — small picture-in-picture when HR is speaking */}
        {hrSpeaking && (
          <div style={S.videoBox}>
            <div style={S.videoLabel}><span>🎙 HR INTERVIEWER</span><span style={{ color: '#22c55e', fontSize: '10px' }}>● LIVE</span></div>
            <video ref={hrVideoRef} autoPlay playsInline style={S.video} />
          </div>
        )}

        {/* Dialogue History */}
        {phase === 'interview' && dialogue.length > 0 && (
          <div style={S.dialogueBox}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>CONVERSATION</p>
            <div style={S.dialogueScroll}>
              {dialogue.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: d.role === 'ai' ? 'flex-start' : 'flex-end', marginBottom: '10px' }}>
                  {d.role === 'ai' && (
                    <div style={S.avatarBubble}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    </div>
                  )}
                  <div style={{ ...S.dialogueMsg, ...(d.role === 'ai' ? S.dialogueAi : S.dialogueCandidate) }}>
                    <div style={{ fontSize: '10px', marginBottom: '3px', opacity: 0.7 }}>
                      {d.role === 'ai' ? `AI · Q${d.qNum}` : 'You'} · {d.ts}
                    </div>
                    <p style={{ fontSize: '12px', lineHeight: '1.6', margin: 0 }}>{d.text}</p>
                  </div>
                </div>
              ))}
              <div ref={dialogueEndRef} />
            </div>
          </div>
        )}

        {phase === 'interview' && (
          <div style={S.procStatus}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
              PROCTORING {faceApiReady ? '● ACTIVE' : '○ LIMITED'} {cocoReady && '· OBJECTS ● ACTIVE'}
            </p>

            {/* Mood indicator */}
            {currentMood && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', padding: '4px 8px', background: 'var(--bg-subtle)', fontSize: '12px' }}>
                <span>{currentMood.expression === 'Happy' ? '😊' : currentMood.expression === 'Sad' ? '😢' : currentMood.expression === 'Angry' ? '😠' : currentMood.expression === 'Nervous' ? '😰' : currentMood.expression === 'Surprised' ? '😲' : '😐'}</span>
                <span style={{ fontWeight: 600 }}>{currentMood.expression}</span>
                <span style={{ color: 'var(--text-muted)' }}>{currentMood.confidence}%</span>
              </div>
            )}

            {/* Detected objects */}
            {detectedObjects.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                {detectedObjects.map((obj, i) => (
                  <span key={i} style={{ fontSize: '11px', padding: '2px 8px', background: '#fee2e2', color: '#dc2626', fontWeight: 600 }}>
                    {obj.name} ({obj.confidence}%)
                  </span>
                ))}
              </div>
            )}

            {procHistory.length === 0 ? <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No alerts</p> : (
              <div style={{ maxHeight: '80px', overflowY: 'auto' }}>
                {procHistory.slice(0, 5).map((h, i) => (
                  <div key={i} style={{ fontSize: '11px', color: 'var(--danger)', padding: '2px 0', display: 'flex', gap: '6px' }}>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{h.ts}</span><span>{h.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {hrSpeakRequest && !hrSpeaking && (
          <div style={S.hrBanner}><span>HR wants to speak</span><button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={acceptHrSpeak}>Accept</button></div>
        )}
        {hrSpeaking && <div style={{ ...S.hrBanner, background: '#22c55e', animation: 'none' }}>🎙 HR speaking — AI paused</div>}

        {hrCustomQuestion && (
          <div style={{ padding: '10px 16px', background: 'var(--primary-light)', borderTop: '1px solid var(--primary)', fontSize: '13px' }}>
            <p style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '4px' }}>HR QUESTION</p>
            <p style={{ color: 'var(--text)', lineHeight: '1.5' }}>{hrCustomQuestion}</p>
          </div>
        )}

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }} onClick={copyLink}>📋 Copy Interview Link</button>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>Room: {roomId}</p>
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div style={S.rightPanel} className="interview-room__main">
        {/* ROOM LOCKED */}
        {roomLocked && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '28px', marginBottom: '12px' }}>ROOM IN USE</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', maxWidth: '400px', margin: '0 auto 24px' }}>
              This interview link already has an active candidate session. Each link supports only one interview at a time.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Back to Home</button>
          </div>
        )}

        {phase === 'setup' && !roomLocked && (
          <div style={S.setupCard} className="card">
            <h2 style={S.setupTitle}>AI INTERVIEW SESSION</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>The AI interviewer will speak 5 questions aloud. Answer by voice recording or typing. Code questions include an editor.</p>
            {prefillInfo && (
              <div style={{ marginBottom: '18px', padding: '14px 16px', background: 'var(--primary-light)', border: '1px solid rgba(119, 91, 246, 0.24)' }}>
                <p style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 700, marginBottom: '4px' }}>PREVIOUS ENTRY FOUND</p>
                <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.6', margin: 0 }}>
                  {prefillInfo.message}
                </p>
                {resumeDraft?.questions?.length > 0 && resumeDraft.status !== 'completed' && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                    <button type="button" className="btn btn-primary" onClick={() => resumePreviousDraft(resumeDraft)}>
                      Continue Previous Session
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setResumeDraft(null)
                        setSessionId(createDraftSessionId())
                        setQuestions([])
                        setAnswers([])
                        setQIndex(0)
                        setTimer(0)
                        setQuestionDurations({})
                        enqueueAction({
                          action_type: 'navigation',
                          field_name: 'restart_session',
                          message: `Started a fresh session at ${new Date().toLocaleTimeString()}`,
                        })
                      }}
                    >
                      Start Fresh
                    </button>
                  </div>
                )}
              </div>
            )}
            <form onSubmit={handleStart}>
              <div className="form-group">
                <label>Your Name *</label>
                <input
                  value={candidateName}
                  onChange={e => setTrackedField('candidateName', e.target.value, setCandidateName)}
                  onBlur={e => markFieldBlur('candidateName', e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={candidateEmail}
                  onChange={e => setTrackedField('candidateEmail', e.target.value, setCandidateEmail)}
                  onBlur={e => markFieldBlur('candidateEmail', e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  value={candidatePhone}
                  onChange={e => setTrackedField('candidatePhone', e.target.value, setCandidatePhone)}
                  onBlur={e => markFieldBlur('candidatePhone', e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="form-group">
                <label>Candidate ID (optional)</label>
                <input
                  value={candidateCustomId}
                  onChange={e => setTrackedField('candidateCustomId', e.target.value, setCandidateCustomId)}
                  onBlur={e => markFieldBlur('candidateCustomId', e.target.value)}
                  placeholder="EMP-2026-001"
                />
              </div>
              <div className="form-group">
                <label>Job Title / Role</label>
                <input
                  value={jobTitle}
                  onChange={e => setTrackedField('jobTitle', e.target.value, setJobTitle)}
                  onBlur={e => markFieldBlur('jobTitle', e.target.value)}
                  placeholder="e.g. Frontend Developer"
                />
              </div>
              <div className="form-group">
                <label>Job Description (optional)</label>
                <textarea
                  value={jobDescription}
                  onChange={e => setTrackedField('jobDescription', e.target.value, setJobDescription)}
                  onBlur={e => markFieldBlur('jobDescription', e.target.value)}
                  placeholder="Paste JD for targeted questions…"
                  style={{ minHeight: '80px' }}
                />
              </div>
              <div className="form-group">
                <label>Resume (PDF / DOCX) — optional</label>
                <input type="file" accept=".pdf,.docx" onChange={e => handleResumeSelect(e.target.files[0])} />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Upload for personalized difficulty matching.</p>
                {parsingResume && <p style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '6px' }}>Parsing resume…</p>}
                {parsedResume && (
                  <div style={{ marginTop: '8px', padding: '10px 12px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700 }}>Resume Analysis</span>
                      <span style={{ fontWeight: 700, color: parsedResume.match_score >= 70 ? '#22c55e' : parsedResume.match_score >= 40 ? '#eab308' : '#dc2626' }}>
                        {parsedResume.match_score}% match
                      </span>
                    </div>
                    {parsedResume.years_experience > 0 && <p style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>{parsedResume.years_experience} years experience detected</p>}
                    {parsedResume.skills?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {parsedResume.skills.slice(0, 10).map((s, i) => (
                          <span key={i} style={{ padding: '2px 6px', background: parsedResume.matched_skills?.includes(s) ? 'var(--primary-light)' : '#f1f5f9', fontSize: '11px', fontWeight: parsedResume.matched_skills?.includes(s) ? 700 : 400, color: parsedResume.matched_skills?.includes(s) ? 'var(--primary)' : 'var(--text-muted)' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      Difficulty: <strong>{parsedResume.match_score >= 70 ? 'Advanced' : parsedResume.match_score >= 30 ? 'Intermediate' : 'Basic'}</strong> questions will be selected
                    </p>
                  </div>
                )}
              </div>
              <VoiceSelector
                language={voiceLang}
                gender={voiceGender}
                onLanguageChange={setVoiceLang}
                onGenderChange={setVoiceGender}
              />
              <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', marginTop: '8px' }}>Start Interview</button>
            </form>
            <hr className="divider" style={{ margin: '24px 0 16px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <p>🎙 Voice + text answers</p><p>🤖 AI asks questions aloud</p>
              <p>👁️ Face proctoring active</p><p>💻 Code editor for coding Qs</p>
              <p>📊 AI evaluation report</p><p>🔗 Shareable interview link</p>
            </div>
          </div>
        )}

        {(phase === 'loading' || phase === 'ending') && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <span className="spinner" style={{ width: '36px', height: '36px' }} />
            <p style={{ marginTop: '20px', color: 'var(--text-muted)', fontSize: '15px' }}>{phase === 'loading' ? 'Preparing questions…' : 'Generating evaluation…'}</p>
          </div>
        )}

        {phase === 'interview' && currentQ && (
          <div style={S.interviewPanel}>
            <div style={S.progressBar}><div style={{ ...S.progressFill, width: `${(qIndex/questions.length)*100}%` }} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              <span>Question {qIndex + 1} of {questions.length}</span>
              {matchScore !== null && <span>Match: <strong style={{ color: 'var(--primary)' }}>{matchScore}%</strong></span>}
              <span className={`badge badge-${dColor(currentQ.difficulty)}`}>{currentQ.difficulty || 'intermediate'}</span>
            </div>

            <div style={S.questionBox}>
              <div style={S.qNum}>Q{qIndex+1}</div>
              <div style={{ flex: 1 }}>
                <p style={S.qText}>{currentQ.text}</p>
                {currentQ.type === 'code' && <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, marginTop: '8px', display: 'inline-block' }}>💻 CODE QUESTION</span>}
              </div>
            </div>

            {aiSpeaking && (
              <div style={{ padding: '10px 16px', background: 'var(--primary-light)', borderLeft: '3px solid var(--primary)', fontSize: '13px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <span className="pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
                AI is reading the question…
              </div>
            )}

            {hrCustomQuestion && (
              <div style={{ marginTop: '12px', padding: '16px', background: 'var(--primary-light)', border: '2px solid var(--primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '16px' }}>🎙</span>
                  <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)' }}>HR IS ASKING</span>
                </div>
                <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: '1.6', color: 'var(--text)' }}>{hrCustomQuestion}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Answer below — the HR interviewer is watching live.</p>
              </div>
            )}

            {isCode ? (
              <div style={{ marginTop: '16px' }}>
                <CodeEditor value={codeValue} onChange={v => setCodeValue(v || '')} language={codeLang} onLanguageChange={setCodeLang} />
              </div>
            ) : (
              <div style={{ marginTop: '16px' }}>
                <div style={S.recordRow}>
                  <button className={`btn ${recording ? 'btn-danger' : 'btn-outline'}`} onClick={toggleRecording} disabled={hrSpeaking}>
                    {recording ? '⏹ Stop Recording' : '🎙 Record Answer'}
                  </button>
                  {recording && <span style={{ fontSize: '13px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}><span className="pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />Recording…</span>}
                  {transcribing && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Transcribing…</span>}
                </div>
                <textarea
                  value={textAnswer}
                  onChange={e => setTextAnswer(e.target.value)}
                  onBlur={e => enqueueAction({
                    action_type: 'blur',
                    field_name: `answer_text_${qIndex + 1}`,
                    new_value: e.target.value,
                    message: `Reviewed answer draft for question #${qIndex + 1} at ${new Date().toLocaleTimeString()}`,
                  })}
                  placeholder="Answer appears here after recording, or type directly…"
                  style={S.textarea}
                  disabled={hrSpeaking}
                />
              </div>
            )}

            <button className="btn btn-primary" onClick={submitAnswer} disabled={submitting || hrSpeaking || (!isCode && !textAnswer.trim()) || (isCode && !codeValue.trim())} style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}>
              {submitting ? <><span className="spinner" style={{ width: '16px', height: '16px' }} /> Evaluating…</> : qIndex === questions.length - 1 ? 'Submit & Finish' : 'Submit Answer →'}
            </button>

            {answers.length > 0 && (
              <div style={{ marginTop: '28px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Answered ({answers.length}/{questions.length})</p>
                {answers.map((a, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '13px', display: 'flex', gap: '8px' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>Q{i+1}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{a.answer.substring(0, 100)}{a.answer.length > 100 ? '…' : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function dColor(d) { return d === 'advanced' ? 'danger' : d === 'intermediate' ? 'warning' : 'success' }
function sColor(s) { return s >= 70 ? '#22c55e' : s >= 40 ? '#eab308' : '#dc2626' }

const S = {
  roomWrapper: { display: 'grid', gridTemplateColumns: '320px 1fr', height: 'calc(100vh - 60px)', overflow: 'hidden' },
  leftPanel: { borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-subtle)', overflowY: 'auto', overflowX: 'hidden' },
  statusBar: { padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  dot: { width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', flexShrink: 0 },
  videoBox: { position: 'relative', borderBottom: '1px solid var(--border)', flexShrink: 0, borderRadius: '0', overflow: 'hidden' },
  videoLabel: { padding: '5px 12px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  video: { width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block', background: '#0a0a0a' },
  procOverlay: { position: 'absolute', bottom: '8px', left: '8px', right: '8px', display: 'flex', flexDirection: 'column', gap: '4px' },
  procWarn: { color: '#fff', padding: '6px 10px', fontSize: '12px', fontWeight: 600, borderRadius: '8px' },
  aiAvatar: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '90px', background: 'linear-gradient(135deg, rgba(108,99,255,0.15) 0%, rgba(0,212,255,0.08) 100%)', position: 'relative', transition: 'background 0.4s ease' },
  avatarCircle: { width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--font-head)', fontSize: '24px', letterSpacing: '0.1em', transition: 'all 0.3s ease', zIndex: 1 },
  soundWaves: { position: 'absolute', bottom: '16px', display: 'flex', gap: '3px', alignItems: 'flex-end' },
  wave: { width: '3px', background: '#fff', borderRadius: '2px', animation: 'wave 0.6s ease-in-out infinite alternate', display: 'block' },
  procStatus: { padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)', flexShrink: 0 },
  hrBanner: { padding: '14px 16px', background: 'linear-gradient(135deg, #6C63FF, #5A52E0)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#fff', fontWeight: 700, flexShrink: 0, position: 'sticky', top: 0, zIndex: 20, gap: '12px', animation: 'pulse-bg 1.5s ease-in-out infinite' },
  rightPanel: { overflowY: 'auto', padding: '32px', background: 'var(--bg)' },
  setupCard: { maxWidth: '520px', margin: '0 auto' },
  setupTitle: { fontFamily: 'var(--font-head)', fontSize: '28px', marginBottom: '8px' },
  interviewPanel: { maxWidth: '680px', margin: '0 auto' },
  progressBar: { height: '4px', background: 'var(--border)', width: '100%', borderRadius: '2px' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #6C63FF, #00D4FF)', transition: 'width 0.4s ease', borderRadius: '2px' },
  questionBox: { border: '1px solid var(--border)', padding: '20px', marginTop: '12px', display: 'flex', gap: '16px', alignItems: 'flex-start', borderRadius: '12px', background: 'var(--bg-glass)' },
  qNum: { fontFamily: 'var(--font-head)', fontSize: '28px', color: 'var(--primary)', flexShrink: 0 },
  qText: { fontSize: '15px', lineHeight: '1.7' },
  recordRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  textarea: { marginTop: '12px', minHeight: '140px', width: '100%', padding: '12px', fontSize: '14px', border: '1px solid var(--border)', fontFamily: 'var(--font-body)', resize: 'vertical', background: 'var(--bg-glass)', color: 'var(--text)', borderRadius: '8px' },
  endScreen: { minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)', padding: '32px' },
  endTitle: { fontFamily: 'var(--font-head)', fontSize: '42px', marginBottom: '12px' },
  dialogueBox: { flexShrink: 0, maxHeight: '180px', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '8px 14px', borderBottom: '1px solid var(--border)' },
  dialogueScroll: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' },
  avatarBubble: { width: '24px', height: '24px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: '6px', marginTop: '2px', borderRadius: '6px' },
  dialogueMsg: { padding: '8px 10px', fontSize: '11px', maxWidth: '75%', borderRadius: '10px' },
  dialogueAi: { background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text)' },
  dialogueCandidate: { background: 'linear-gradient(135deg, #6C63FF, #00D4FF)', color: '#fff', border: 'none' },
}
