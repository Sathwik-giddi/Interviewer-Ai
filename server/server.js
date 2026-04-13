'use strict'
require('dotenv').config()
const express   = require('express')
const http      = require('http')
const { Server } = require('socket.io')
const cors      = require('cors')

const PORT = process.env.PORT || 3000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
})

app.use(cors({ origin: CLIENT_ORIGIN }))
app.get('/health', (_, res) => res.json({ status: 'ok' }))

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TURN Credentials - Static Metered.ca Configuration
 * Uses long-lived TURN credentials from Metered dashboard
 * No API key required - credentials are set via environment variables
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Static TURN credentials from Metered.ca dashboard
// These are long-lived credentials that don't expire
const TURN_USERNAME = process.env.TURN_USERNAME || ''
const TURN_CREDENTIAL = process.env.TURN_CREDENTIAL || ''
const TURN_DOMAIN = process.env.TURN_DOMAIN || ''

// Build TURN server URLs from domain
function buildTurnUrls() {
  if (!TURN_DOMAIN) return []
  return [
    `turn:${TURN_DOMAIN}:80`,
    `turn:${TURN_DOMAIN}:443`,
    `turn:${TURN_DOMAIN}:443?transport=tcp`,
    `turn:${TURN_DOMAIN}:3478`,
  ]
}

// In-memory cache for TURN credentials
let turnCredentialsCache = {
  credentials: null,
  expiresAt: 0,
}

// Cache TTL: 24 hours (static credentials don't expire, but we refresh cache periodically)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Get static TURN credentials from environment variables
 * @returns {Object|null} TURN credentials object or null if not configured
 */
function getStaticTurnCredentials() {
  if (!TURN_USERNAME || !TURN_CREDENTIAL) {
    return null
  }

  const urls = buildTurnUrls()
  if (urls.length === 0) {
    return null
  }

  return {
    urls,
    username: TURN_USERNAME,
    credential: TURN_CREDENTIAL,
    expiresAt: Date.now() + CACHE_TTL_MS,
  }
}

/**
 * Get TURN credentials (from cache or static config)
 * Static credentials don't expire, but we cache them to avoid rebuilding URLs on every request
 */
function getTurnCredentials() {
  const now = Date.now()

  // Return cached credentials if still valid
  if (
    turnCredentialsCache.credentials &&
    turnCredentialsCache.expiresAt > now
  ) {
    return turnCredentialsCache.credentials
  }

  // Get static credentials from environment variables
  const credentials = getStaticTurnCredentials()
  
  if (!credentials) {
    throw new Error('TURN credentials not configured. Set TURN_USERNAME, TURN_CREDENTIAL, and TURN_DOMAIN in environment variables.')
  }

  // Update cache
  turnCredentialsCache = {
    credentials,
    expiresAt: credentials.expiresAt,
  }

  console.log('[TURN] Using static TURN credentials')
  return credentials
}

/**
 * GET /api/turn-credentials
 * Returns TURN server configuration for WebRTC
 * No authentication required (public endpoint, credentials are temporary)
 */
app.get('/api/turn-credentials', (req, res) => {
  try {
    const credentials = getTurnCredentials()

    res.json({
      iceServers: [
        // STUN servers (always included, free)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        // TURN server from Metered
        {
          urls: credentials.urls,
          username: credentials.username,
          credential: credentials.credential,
        },
      ],
      expiresAt: credentials.expiresAt,
    })
  } catch (error) {
    console.error('[TURN] Error fetching credentials:', error.message)
    res.status(500).json({
      error: 'TURN service unavailable',
      message: 'Failed to retrieve TURN credentials. Please try again later.',
    })
  }
})

/**
 * GET /api/turn-credentials/validate
 * Check if current credentials are still valid
 */
app.get('/api/turn-credentials/validate', (req, res) => {
  const now = Date.now()
  const isValid = turnCredentialsCache.credentials && turnCredentialsCache.expiresAt > now

  res.json({
    valid: isValid,
    expiresAt: turnCredentialsCache.expiresAt || null,
    expiresIn: isValid ? Math.floor((turnCredentialsCache.expiresAt - now) / 1000) : 0,
  })
})

/**
 * POST /api/turn-credentials/refresh
 * Force refresh credentials (admin endpoint)
 */
app.post('/api/turn-credentials/refresh', (req, res) => {
  try {
    // Clear cache and fetch fresh
    turnCredentialsCache = { credentials: null, expiresAt: 0 }
    const credentials = getTurnCredentials()

    res.json({
      success: true,
      expiresAt: credentials.expiresAt,
    })
  } catch (error) {
    console.error('[TURN] Error refreshing credentials:', error.message)
    res.status(500).json({ error: 'Failed to refresh credentials' })
  }
})

/**
 * Room structure:
 *   rooms[roomId] = {
 *     candidate: socketId | null,
 *     hr:        socketId | null,
 *     observers: Set<socketId>,
 *   }
 */
const rooms = {}
const observerAliases = new Map()

function getRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = { candidate: null, hr: null, observers: new Set(), candidateLocked: false }
  }
  return rooms[roomId]
}

function resolveRoomId(roomId) {
  return observerAliases.get(roomId) || roomId
}

/**
 * Periodic cleanup of stale observer aliases (every 10 minutes)
 * Removes aliases whose source room no longer exists
 */
setInterval(() => {
  for (const [aliasRoomId, sourceRoomId] of observerAliases.entries()) {
    if (!rooms[sourceRoomId]) {
      observerAliases.delete(aliasRoomId)
      console.log(`[Signaling] Cleaned up stale alias: ${aliasRoomId} → ${sourceRoomId}`)
    }
  }
}, 10 * 60 * 1000)

io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`)

  // ── Join room ──────────────────────────────────────────────────────────
  socket.on('join-room', ({ roomId, userId, role }) => {
    // Input validation
    if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
      console.log(`[Signaling] join-room rejected: invalid roomId from ${socket.id}`)
      socket.emit('error', { message: 'Invalid roomId' })
      return
    }
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      console.log(`[Signaling] join-room rejected: invalid userId from ${socket.id}`)
      socket.emit('error', { message: 'Invalid userId' })
      return
    }
    if (!role || !['candidate', 'hr'].includes(role)) {
      console.log(`[Signaling] join-room rejected: invalid role "${role}" from ${socket.id}`)
      socket.emit('error', { message: 'Invalid role. Must be "candidate" or "hr".' })
      return
    }

    socket.join(roomId)
    const resolvedRoomId = resolveRoomId(roomId)
    if (resolvedRoomId && resolvedRoomId !== roomId) {
      socket.join(resolvedRoomId)
    }
    socket.data.roomId = resolvedRoomId
    socket.data.joinedRoomId = roomId
    socket.data.userId = userId
    socket.data.role   = role

    const room = getRoom(resolvedRoomId)

    if (role === 'candidate') {
      // Enforce single candidate per room
      if (room.candidateLocked && room.candidate && room.candidate !== socket.id) {
        console.log(`[Signaling] [room:${resolvedRoomId}] REJECTED duplicate candidate: ${userId}`)
        socket.emit('room-locked', { message: 'This interview room already has an active candidate. Each link supports only one session at a time.' })
        socket.leave(roomId)
        if (resolvedRoomId !== roomId) socket.leave(resolvedRoomId)
        return
      }
      room.candidate = socket.id
      room.candidateLocked = true
      console.log(`[Signaling] [room:${resolvedRoomId}] Candidate joined: ${userId} (alias: ${roomId})`)
    } else if (role === 'hr') {
      room.hr = socket.id
      console.log(`[Signaling] [room:${resolvedRoomId}] HR joined (observer): ${userId} (alias: ${roomId})`)
      room.observers.add(socket.id)
    }

    // Notify others in both the original and resolved room that a new peer joined
    const peerJoinedPayload = { userId, role, socketId: socket.id }
    socket.to(roomId).emit('peer-joined', peerJoinedPayload)
    if (resolvedRoomId !== roomId) {
      socket.to(resolvedRoomId).emit('peer-joined', peerJoinedPayload)
    }
    socket.emit('room-state', {
      hasCandidate: !!room.candidate,
      observerCount: room.observers.size,
    })
  })

  socket.on('register-observer-alias', ({ observerRoomId, sourceRoomId }) => {
    if (!observerRoomId || !sourceRoomId || observerRoomId === sourceRoomId) return

    observerAliases.set(observerRoomId, sourceRoomId)

    const sourceRoom = getRoom(sourceRoomId)
    const aliasRoom = rooms[observerRoomId]

    // Only set candidate if not already set (prevent overwriting existing candidate)
    if (socket.data.role === 'candidate' && !sourceRoom.candidate) {
      sourceRoom.candidate = socket.id
      sourceRoom.candidateLocked = true
    }

    if (aliasRoom) {
      if (aliasRoom.hr && !sourceRoom.hr) sourceRoom.hr = aliasRoom.hr
      aliasRoom.observers.forEach((observerId) => sourceRoom.observers.add(observerId))
      delete rooms[observerRoomId]
    }

    sourceRoom.observers.forEach((observerId) => {
      io.to(observerId).emit('room-state', {
        hasCandidate: !!sourceRoom.candidate,
        observerCount: sourceRoom.observers.size,
      })
    })
  })

  // ── Stream request: HR asks candidate to send WebRTC offer ──────────
  socket.on('request-stream', ({ roomId }) => {
    if (socket.data.role !== 'hr') {
      console.log(`[Signaling] request-stream rejected: non-HR role "${socket.data.role}" from ${socket.id}`)
      return
    }
    const resolvedRoomId = resolveRoomId(roomId)
    const room = getRoom(resolvedRoomId)
    if (room.candidate) {
      console.log(`[Signaling] [room:${resolvedRoomId}] HR requested stream from candidate (alias: ${roomId})`)
      io.to(room.candidate).emit('send-stream', { to: socket.id })
    }
  })

  // ── WebRTC Signaling ───────────────────────────────────────────────────
  socket.on('offer', ({ to, offer }) => {
    if (!to || !offer) return
    console.log(`[Signaling] Relay offer from ${socket.id} to ${to}`)
    io.to(to).emit('offer', { from: socket.id, offer })
  })

  socket.on('answer', ({ to, answer }) => {
    if (!to || !answer) return
    console.log(`[Signaling] Relay answer from ${socket.id} to ${to}`)
    io.to(to).emit('answer', { from: socket.id, answer })
  })

  socket.on('ice-candidate', ({ to, candidate }) => {
    if (!to || !candidate) return
    io.to(to).emit('ice-candidate', { from: socket.id, candidate })
  })

  // ── HR → Candidate WebRTC signaling (two-way audio/video) ──────────────
  socket.on('hr-offer', ({ to, offer }) => {
    if (socket.data.role !== 'hr') {
      console.log(`[Signaling] hr-offer rejected: non-HR role "${socket.data.role}" from ${socket.id}`)
      return
    }
    if (!to || !offer) return
    console.log(`[WebRTC] [room:${socket.data.roomId}] HR offer → candidate ${to}`)
    io.to(to).emit('hr-offer', { from: socket.id, offer })
  })

  socket.on('candidate-answer', ({ to, answer }) => {
    if (socket.data.role !== 'candidate') {
      console.log(`[Signaling] candidate-answer rejected: non-candidate role "${socket.data.role}" from ${socket.id}`)
      return
    }
    if (!to || !answer) return
    console.log(`[WebRTC] [room:${socket.data.roomId}] Candidate answer → HR ${to}`)
    io.to(to).emit('candidate-answer', { from: socket.id, answer })
  })

  socket.on('hr-ice-candidate', ({ to, candidate }) => {
    if (!to || !candidate) return
    io.to(to).emit('hr-ice-candidate', { from: socket.id, candidate })
  })

  // ── HR speak request → candidate ──────────────────────────────────────
  socket.on('hr-speak-request', ({ roomId }) => {
    if (socket.data.role !== 'hr') {
      console.log(`[Signaling] hr-speak-request rejected: non-HR role "${socket.data.role}" from ${socket.id}`)
      return
    }
    const resolvedRoomId = resolveRoomId(roomId)
    const room = getRoom(resolvedRoomId)
    if (room.candidate) {
      console.log(`[Signaling] [room:${resolvedRoomId}] HR requested to speak (alias: ${roomId})`)
      io.to(room.candidate).emit('hr-speak-request', { hrSocketId: socket.id })
    }
  })

  // ── Candidate accepted HR speak → notify all observers + candidate, tell AI to pause ─────────
  socket.on('hr-speak-accept', ({ roomId }) => {
    if (socket.data.role !== 'candidate') {
      console.log(`[Signaling] hr-speak-accept rejected: non-candidate role "${socket.data.role}" from ${socket.id}`)
      return
    }
    const resolvedRoomId = resolveRoomId(roomId)
    const room = getRoom(resolvedRoomId)
    console.log(`[Signaling] [room:${resolvedRoomId}] Candidate accepted HR speak (alias: ${roomId})`)

    // Notify all observers (including HR)
    room.observers.forEach(obsId => {
      io.to(obsId).emit('hr-speak-accepted')
    })
    // Also confirm to the candidate
    socket.emit('hr-speak-accepted')

    // Broadcast to the resolved room to pause AI
    socket.to(resolvedRoomId).emit('ai-pause')
    if (resolvedRoomId !== roomId) {
      socket.to(roomId).emit('ai-pause')
    }
  })

  // ── HR ended speaking → resume AI ─────────────────────────────────────
  socket.on('hr-speak-end', ({ roomId }) => {
    if (socket.data.role !== 'hr') {
      console.log(`[Signaling] hr-speak-end rejected: non-HR role "${socket.data.role}" from ${socket.id}`)
      return
    }
    const resolvedRoomId = resolveRoomId(roomId)
    const room = getRoom(resolvedRoomId)
    console.log(`[Signaling] [room:${resolvedRoomId}] HR ended speaking — resuming AI (alias: ${roomId})`)
    // Notify candidate to resume
    if (room.candidate) {
      io.to(room.candidate).emit('hr-speak-end')
    }
    // Broadcast to resolved room to resume AI
    socket.to(resolvedRoomId).emit('ai-resume')
    if (resolvedRoomId !== roomId) {
      socket.to(roomId).emit('ai-resume')
    }
  })

  // ── Proctoring alert relay (candidate → HR observer) ──────────────────
  socket.on('proctoring-alert', ({ roomId, warning }) => {
    const resolvedRoomId = resolveRoomId(roomId)
    const room = getRoom(resolvedRoomId)
    room.observers.forEach(obsId => {
      io.to(obsId).emit('proctoring-alert', { warning, candidateId: socket.data.userId })
    })
  })

  // ── Interview state relay (candidate → HR) ────────────────────────────
  socket.on('interview-state', (data) => {
    if (!data || !data.roomId) return
    const resolvedRoomId = resolveRoomId(data.roomId)
    const room = getRoom(resolvedRoomId)
    room.observers.forEach(obsId => {
      io.to(obsId).emit('interview-state', data)
    })
  })

  // ── Candidate typing relay (candidate → HR) ──────────────────────────
  socket.on('candidate-typing', (data) => {
    if (!data || !data.roomId) return
    const resolvedRoomId = resolveRoomId(data.roomId)
    const room = getRoom(resolvedRoomId)
    room.observers.forEach(obsId => {
      io.to(obsId).emit('candidate-typing', data)
    })
  })

  // ── AI speaking relay (candidate → HR) ────────────────────────────────
  socket.on('ai-speaking', (data) => {
    if (!data || !data.roomId) return
    const resolvedRoomId = resolveRoomId(data.roomId)
    const room = getRoom(resolvedRoomId)
    room.observers.forEach(obsId => {
      io.to(obsId).emit('ai-speaking', data)
    })
  })

  // ── Answer submitted relay (candidate → HR) ──────────────────────────
  socket.on('answer-submitted', (data) => {
    if (!data || !data.roomId) return
    const resolvedRoomId = resolveRoomId(data.roomId)
    const room = getRoom(resolvedRoomId)
    room.observers.forEach(obsId => {
      io.to(obsId).emit('answer-submitted', data)
    })
  })

  // ── Proctoring state relay (candidate → HR) — mood, objects, warnings
  socket.on('proctoring-state', (data) => {
    if (!data || !data.roomId) return
    const resolvedRoomId = resolveRoomId(data.roomId)
    const room = getRoom(resolvedRoomId)
    room.observers.forEach(obsId => {
      io.to(obsId).emit('proctoring-state', data)
    })
  })

  // ── HR custom question relay (HR observer → candidate) ────────────────
  socket.on('hr-custom-question', (data) => {
    if (socket.data.role !== 'hr') {
      console.log(`[Signaling] hr-custom-question rejected: non-HR role "${socket.data.role}" from ${socket.id}`)
      return
    }
    if (!data || !data.roomId) return
    const resolvedRoomId = resolveRoomId(data.roomId)
    const room = getRoom(resolvedRoomId)
    if (room.candidate) {
      console.log(`[Signaling] [room:${resolvedRoomId}] HR sent custom question to candidate (alias: ${data.roomId})`)
      io.to(room.candidate).emit('hr-custom-question', data)
    }
  })

  // ── HR question audio relay (HR observer → candidate) ────────────────
  socket.on('hr-question-audio', (data) => {
    if (socket.data.role !== 'hr') {
      console.log(`[Signaling] hr-question-audio rejected: non-HR role "${socket.data.role}" from ${socket.id}`)
      return
    }
    if (!data || !data.roomId) return
    const resolvedRoomId = resolveRoomId(data.roomId)
    const room = getRoom(resolvedRoomId)
    if (room.candidate) {
      console.log(`[Signaling] [room:${resolvedRoomId}] HR sent question audio to candidate (alias: ${data.roomId})`)
      io.to(room.candidate).emit('hr-question-audio', data)
    }
  })

  // ── Interview ended ────────────────────────────────────────────────────
  socket.on('interview-ended', (data) => {
    const rawRoomId = typeof data === 'string' ? data : data?.roomId
    if (!rawRoomId || typeof rawRoomId !== 'string') {
      console.log(`[Signaling] interview-ended rejected: invalid roomId from ${socket.id}`)
      return
    }
    const resolvedRoomId = resolveRoomId(rawRoomId)
    console.log(`[Signaling] [room:${resolvedRoomId}] Interview ended (alias: ${rawRoomId})`)
    socket.to(resolvedRoomId).emit('interview-ended', data)
    if (resolvedRoomId !== rawRoomId) {
      socket.to(rawRoomId).emit('interview-ended', data)
    }
  })

  // ── Disconnect ─────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const { roomId, role } = socket.data
    if (!roomId) return

    const room = rooms[roomId]
    if (!room) return

    if (role === 'candidate' && room.candidate === socket.id) {
      room.candidate = null
      room.candidateLocked = false
    }
    if (role === 'hr' && room.hr === socket.id) {
      room.hr = null
    }
    room.observers.delete(socket.id)

    // Notify both resolved room and original joined room
    const peerLeftPayload = { socketId: socket.id, role }
    socket.to(roomId).emit('peer-left', peerLeftPayload)
    const joinedRoomId = socket.data.joinedRoomId
    if (joinedRoomId && joinedRoomId !== roomId) {
      socket.to(joinedRoomId).emit('peer-left', peerLeftPayload)
    }
    console.log(`[-] Socket disconnected: ${socket.id} (room: ${roomId}, joined: ${joinedRoomId}, role: ${role})`)

    // Clean up empty rooms
    if (!room.candidate && !room.hr && room.observers.size === 0) {
      delete rooms[roomId]
      for (const [aliasRoomId, sourceRoomId] of observerAliases.entries()) {
        if (sourceRoomId === roomId) observerAliases.delete(aliasRoomId)
      }
    }
  })
})

server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on http://localhost:${PORT}`)
  console.log(`   CORS origin: ${CLIENT_ORIGIN}`)
})