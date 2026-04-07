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
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
})

app.use(cors())
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
async function getTurnCredentials() {
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
app.get('/api/turn-credentials', async (req, res) => {
  try {
    const credentials = await getTurnCredentials()

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
      error: 'Failed to fetch TURN credentials',
      message: error.message,
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
app.post('/api/turn-credentials/refresh', async (req, res) => {
  try {
    // Clear cache and fetch fresh
    turnCredentialsCache = { credentials: null, expiresAt: 0, lastFetched: 0 }
    const credentials = await getTurnCredentials()

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

io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`)

  // ── Join room ──────────────────────────────────────────────────────────
  socket.on('join-room', ({ roomId, userId, role }) => {
    socket.join(roomId)
    const resolvedRoomId = resolveRoomId(roomId)
    socket.data.roomId = resolvedRoomId
    socket.data.joinedRoomId = roomId
    socket.data.userId = userId
    socket.data.role   = role

    const room = getRoom(resolvedRoomId)

    if (role === 'candidate') {
      // Enforce single candidate per room
      if (room.candidateLocked && room.candidate && room.candidate !== socket.id) {
        console.log(`[room:${resolvedRoomId}] REJECTED duplicate candidate: ${userId}`)
        socket.emit('room-locked', { message: 'This interview room already has an active candidate. Each link supports only one session at a time.' })
        socket.leave(roomId)
        return
      }
      room.candidate = socket.id
      room.candidateLocked = true
      console.log(`[room:${resolvedRoomId}] Candidate joined: ${userId}`)
    } else if (role === 'hr') {
      room.hr = socket.id
      console.log(`[room:${resolvedRoomId}] HR joined (observer): ${userId}`)
      room.observers.add(socket.id)
    }

    // Notify others in the room that a new peer joined
    socket.to(roomId).emit('peer-joined', { userId, role, socketId: socket.id })
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

    if (socket.data.role === 'candidate') {
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
    const room = getRoom(resolveRoomId(roomId))
    if (room.candidate) {
      console.log(`[room:${roomId}] HR requested stream from candidate`)
      io.to(room.candidate).emit('send-stream', { to: socket.id })
    }
  })

  // ── WebRTC Signaling ───────────────────────────────────────────────────
  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', { from: socket.id, offer })
  })

  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', { from: socket.id, answer })
  })

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate })
  })

  // ── HR speak request → candidate ──────────────────────────────────────
  socket.on('hr-speak-request', ({ roomId }) => {
    const room = getRoom(resolveRoomId(roomId))
    if (room.candidate) {
      console.log(`[room:${roomId}] HR requested to speak`)
      io.to(room.candidate).emit('hr-speak-request', { hrSocketId: socket.id })
    }
  })

  // ── Candidate accepted HR speak → notify HR, tell AI to pause ─────────
  socket.on('hr-speak-accept', ({ roomId }) => {
    const room = getRoom(resolveRoomId(roomId))
    if (room.hr) {
      console.log(`[room:${roomId}] Candidate accepted HR speak`)
      io.to(room.hr).emit('hr-speak-accepted')
    }
    // Broadcast to the whole room to pause AI
    socket.to(roomId).emit('ai-pause')
  })

  // ── HR ended speaking → resume AI ─────────────────────────────────────
  socket.on('hr-speak-end', ({ roomId }) => {
    const room = getRoom(resolveRoomId(roomId))
    console.log(`[room:${roomId}] HR ended speaking — resuming AI`)
    // Notify candidate to resume
    if (room.candidate) {
      io.to(room.candidate).emit('hr-speak-end')
    }
    socket.to(roomId).emit('ai-resume')
  })

  // ── Proctoring alert relay (candidate → HR observer) ──────────────────
  socket.on('proctoring-alert', ({ roomId, warning }) => {
    const room = getRoom(resolveRoomId(roomId))
    room.observers.forEach(obsId => {
      io.to(obsId).emit('proctoring-alert', { warning, candidateId: socket.data.userId })
    })
  })

  // ── Interview state relay (candidate → HR) ────────────────────────────
  socket.on('interview-state', (data) => {
    const room = getRoom(resolveRoomId(data.roomId))
    room.observers.forEach(obsId => {
      io.to(obsId).emit('interview-state', data)
    })
  })

  // ── Candidate typing relay (candidate → HR) ──────────────────────────
  socket.on('candidate-typing', (data) => {
    const room = getRoom(resolveRoomId(data.roomId))
    room.observers.forEach(obsId => {
      io.to(obsId).emit('candidate-typing', data)
    })
  })

  // ── AI speaking relay (candidate → HR) ────────────────────────────────
  socket.on('ai-speaking', (data) => {
    const room = getRoom(resolveRoomId(data.roomId))
    room.observers.forEach(obsId => {
      io.to(obsId).emit('ai-speaking', data)
    })
  })

  // ── Answer submitted relay (candidate → HR) ──────────────────────────
  socket.on('answer-submitted', (data) => {
    const room = getRoom(resolveRoomId(data.roomId))
    room.observers.forEach(obsId => {
      io.to(obsId).emit('answer-submitted', data)
    })
  })

  // ── Proctoring state relay (candidate → HR) — mood, objects, warnings
  socket.on('proctoring-state', (data) => {
    const room = getRoom(resolveRoomId(data.roomId))
    room.observers.forEach(obsId => {
      io.to(obsId).emit('proctoring-state', data)
    })
  })

  // ── HR custom question relay (HR observer → candidate) ────────────────
  socket.on('hr-custom-question', (data) => {
    const room = getRoom(resolveRoomId(data.roomId))
    if (room.candidate) {
      console.log(`[room:${data.roomId}] HR sent custom question to candidate`)
      io.to(room.candidate).emit('hr-custom-question', data)
    }
  })

  // ── HR question audio relay (HR observer → candidate) ────────────────
  socket.on('hr-question-audio', (data) => {
    const room = getRoom(resolveRoomId(data.roomId))
    if (room.candidate) {
      console.log(`[room:${data.roomId}] HR sent question audio to candidate`)
      io.to(room.candidate).emit('hr-question-audio', data)
    }
  })

  // ── Interview ended ────────────────────────────────────────────────────
  socket.on('interview-ended', (data) => {
    const roomId = data?.roomId || data
    socket.to(roomId).emit('interview-ended', data)
    console.log(`[room:${roomId}] Interview ended`)
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

    socket.to(roomId).emit('peer-left', { socketId: socket.id, role })
    console.log(`[-] Socket disconnected: ${socket.id} (room: ${roomId}, role: ${role})`)

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
