'use strict'
require('dotenv').config()

const express       = require('express')
const http          = require('http')
const { Server }    = require('socket.io')
const cors          = require('cors')
const rateLimit     = require('express-rate-limit')
const admin         = require('firebase-admin')

// ─── Validate required environment variables ─────────────────────────────────
const REQUIRED_ENV = ['METERED_API_KEY', 'TURN_USERNAME', 'TURN_CREDENTIAL']
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k])
if (missingEnv.length) {
  console.error(`[FATAL] Missing required environment variables: ${missingEnv.join(', ')}`)
  console.error('Set them in your .env file or deployment environment. Do NOT use hardcoded defaults.')
  process.exit(1)
}

const PORT           = process.env.PORT || 3000
const CLIENT_ORIGIN  = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const METERED_API_KEY   = process.env.METERED_API_KEY
const TURN_USERNAME     = process.env.TURN_USERNAME
const TURN_CREDENTIAL   = process.env.TURN_CREDENTIAL
const METERED_API_URL   = 'https://open-interviewer.metered.live/api/v1/turn/credentials'

// ─── Firebase Admin SDK ──────────────────────────────────────────────────────
const FIREBASE_SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccount.json'

if (!admin.apps.length) {
  try {
    const fs = require('fs')
    if (fs.existsSync(FIREBASE_SERVICE_ACCOUNT_PATH)) {
      const serviceAccount = require(FIREBASE_SERVICE_ACCOUNT_PATH)
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
    } else {
      // Fall back to Application Default Credentials (e.g. in GCP / CI)
      admin.initializeApp({ credential: admin.credential.applicationDefault() })
    }
    console.log('[Firebase] Admin SDK initialized')
  } catch (err) {
    console.error('[FATAL] Failed to initialize Firebase Admin SDK:', err.message)
    console.error('Ensure FIREBASE_SERVICE_ACCOUNT_PATH points to a valid service account JSON file.')
    process.exit(1)
  }
}

const firestore = admin.firestore()

// ─── Express + Socket.io setup ──────────────────────────────────────────────
const app    = express()
const server = http.createServer(app)
const io     = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
})

app.use(cors({ origin: CLIENT_ORIGIN }))

// ─── Rate limiting ──────────────────────────────────────────────────────────
const turnLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Too many TURN credential requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ─── TURN credentials ───────────────────────────────────────────────────────
let turnCredentialsCache = {
  credentials: null,
  expiresAt: 0,
}
const CACHE_TTL_MS = 23 * 60 * 60 * 1000 // 23 hours (dynamic credentials expire at 24h)

async function getTurnCredentials() {
  const now = Date.now()

  // Return cached credentials if still valid
  if (turnCredentialsCache.credentials && turnCredentialsCache.expiresAt > now) {
    return turnCredentialsCache.credentials
  }

  // Fetch dynamic credentials from Metered API
  try {
    const response = await fetch(METERED_API_URL, {
      method: 'GET',
      headers: { 'X-API-Key': METERED_API_KEY },
    })
    if (response.ok) {
      const iceServers = await response.json()
      if (Array.isArray(iceServers) && iceServers.length > 0) {
        console.log('[TURN] Dynamic credentials fetched:', iceServers.length, 'servers')
        turnCredentialsCache = {
          credentials: iceServers,
          expiresAt: now + CACHE_TTL_MS,
        }
        return iceServers
      }
    }
    console.warn('[TURN] Metered API returned status:', response.status)
  } catch (err) {
    console.warn('[TURN] Dynamic API failed:', err.message)
  }

  // No static fallback — fail explicitly in production
  return null
}

// ─── Health check ───────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok' }))

// ─── Custom token endpoint for demo HR ──────────────────────────────────────
const DEMO_HR_UID = process.env.DEMO_HR_UID || 'hr-admin-001'
const DEMO_HR_SECRET = process.env.DEMO_HR_SECRET

app.post('/api/auth/custom-token', express.json(), async (req, res) => {
  const { secret } = req.body || {}
  // Require a shared secret to prevent token forgery
  if (!DEMO_HR_SECRET || secret !== DEMO_HR_SECRET) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  try {
    const customToken = await admin.auth().createCustomToken(DEMO_HR_UID, { role: 'hr' })
    res.json({ customToken })
  } catch (err) {
    console.error('[Auth] Failed to create custom token:', err.message)
    res.status(500).json({ error: 'Failed to create token' })
  }
})

// ─── TURN credential endpoints ──────────────────────────────────────────────
app.get('/api/turn-credentials', turnLimiter, async (req, res) => {
  const iceServers = await getTurnCredentials()
  if (!iceServers) {
    return res.status(500).json({
      error: 'TURN service unavailable',
      message: 'Failed to retrieve TURN credentials. Please try again later.',
    })
  }
  res.json({ iceServers, expiresAt: turnCredentialsCache.expiresAt })
})

app.get('/api/turn-credentials/validate', (req, res) => {
  const now = Date.now()
  const isValid = turnCredentialsCache.credentials && turnCredentialsCache.expiresAt > now
  res.json({
    valid: isValid,
    expiresAt: turnCredentialsCache.expiresAt || null,
    expiresIn: isValid ? Math.floor((turnCredentialsCache.expiresAt - now) / 1000) : 0,
  })
})

app.post('/api/turn-credentials/refresh', turnLimiter, async (req, res) => {
  turnCredentialsCache = { credentials: null, expiresAt: 0 }
  const iceServers = await getTurnCredentials()
  if (!iceServers) {
    return res.status(500).json({ error: 'Failed to refresh credentials' })
  }
  res.json({ success: true, expiresAt: turnCredentialsCache.expiresAt })
})

// ─── Room state ─────────────────────────────────────────────────────────────
/**
 * rooms[roomId] = {
 *   candidate: socketId | null,
 *   hr:        socketId | null,
 *   observers: Set<socketId>,
 *   candidateLocked: boolean,
 * }
 */
const rooms = {}
const observerAliases = new Map()

/** roomSockets: roomId -> Set(socketId) — tracks all sockets in each room */
const roomSockets = new Map()

function getRoom(roomId) {
  return rooms[roomId] || null
}

function getOrCreateRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = { candidate: null, hr: null, observers: new Set(), candidateLocked: false }
  }
  return rooms[roomId]
}

function addSocketToRoom(roomId, socketId) {
  if (!roomSockets.has(roomId)) {
    roomSockets.set(roomId, new Set())
  }
  roomSockets.get(roomId).add(socketId)
}

function removeSocketFromRoom(roomId, socketId) {
  const set = roomSockets.get(roomId)
  if (set) {
    set.delete(socketId)
    if (set.size === 0) roomSockets.delete(roomId)
  }
}

function isSocketInRoom(roomId, socketId) {
  return roomSockets.get(roomId)?.has(socketId) || false
}

function resolveRoomId(roomId) {
  return observerAliases.get(roomId) || roomId
}

// ─── Per-socket rate limiting ───────────────────────────────────────────────
const socketRateLimits = new Map()

function checkSocketRateLimit(socketId, event, maxPerSecond = 10) {
  const key = `${socketId}:${event}`
  const now = Date.now()
  let entry = socketRateLimits.get(key)
  if (!entry || now - entry.windowStart > 1000) {
    entry = { windowStart: now, count: 0 }
    socketRateLimits.set(key, entry)
  }
  entry.count++
  if (entry.count > maxPerSecond) {
    return false // rate limited
  }
  return true
}

// Clean up stale rate limit entries every minute
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of socketRateLimits.entries()) {
    if (now - entry.windowStart > 2000) {
      socketRateLimits.delete(key)
    }
  }
}, 60 * 1000)

// ─── Periodic cleanup of stale observer aliases ─────────────────────────────
setInterval(() => {
  for (const [aliasRoomId, sourceRoomId] of observerAliases.entries()) {
    if (!rooms[sourceRoomId]) {
      observerAliases.delete(aliasRoomId)
      console.log(`[Signaling] Cleaned up stale alias: ${aliasRoomId} → ${sourceRoomId}`)
    }
  }
}, 10 * 60 * 1000)

// ─── Socket authentication middleware ───────────────────────────────────────
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) {
    console.warn(`[Auth] Socket ${socket.id} rejected: no token provided`)
    return next(new Error('Authentication required'))
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    socket.data.uid = decoded.uid
    socket.data.email = decoded.email || null

    // Fetch user role from Firestore
    const userDoc = await firestore.collection('users').doc(decoded.uid).get()
    if (userDoc.exists) {
      socket.data.userRole = userDoc.data().role || null
    } else {
      console.warn(`[Auth] UID ${decoded.uid} not found in Firestore users collection`)
      socket.data.userRole = null
    }

    next()
  } catch (err) {
    console.warn(`[Auth] Socket ${socket.id} rejected: invalid token (${err.message})`)
    next(new Error('Invalid authentication token'))
  }
})

// ─── Socket event handlers ──────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id} (uid: ${socket.data.uid})`)

  // ── Join room ──────────────────────────────────────────────────────────
  socket.on('join-room', ({ roomId, userId, role }) => {
    // Input validation
    if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
      console.warn(`[Signaling] join-room rejected: invalid roomId from ${socket.id}`)
      socket.emit('error', { message: 'Invalid roomId' })
      return
    }
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      console.warn(`[Signaling] join-room rejected: invalid userId from ${socket.id}`)
      socket.emit('error', { message: 'Invalid userId' })
      return
    }
    if (!role || !['candidate', 'hr'].includes(role)) {
      console.warn(`[Signaling] join-room rejected: invalid role "${role}" from ${socket.id}`)
      socket.emit('error', { message: 'Invalid role. Must be "candidate" or "hr".' })
      return
    }

    // Verify the claimed role matches the authenticated user's role
    if (socket.data.userRole && socket.data.userRole !== role) {
      console.warn(`[Signaling] join-room rejected: role mismatch for uid ${socket.data.uid} (claimed: ${role}, actual: ${socket.data.userRole})`)
      socket.emit('error', { message: 'Role mismatch with authenticated user.' })
      return
    }

    // Verify userId matches authenticated uid
    if (userId !== socket.data.uid) {
      console.warn(`[Signaling] join-room rejected: userId mismatch for uid ${socket.data.uid} (claimed: ${userId})`)
      socket.emit('error', { message: 'User ID does not match authenticated user.' })
      return
    }

    socket.join(roomId)
    const resolvedRoomId = resolveRoomId(roomId)
    if (resolvedRoomId !== roomId) {
      socket.join(resolvedRoomId)
    }

    socket.data.roomId = resolvedRoomId
    socket.data.joinedRoomId = roomId
    socket.data.userId = userId
    socket.data.role = role

    // Track socket in roomSockets
    addSocketToRoom(roomId, socket.id)
    if (resolvedRoomId !== roomId) {
      addSocketToRoom(resolvedRoomId, socket.id)
    }

    const room = getOrCreateRoom(resolvedRoomId)

    if (role === 'candidate') {
      // Enforce single candidate per room
      if (room.candidateLocked && room.candidate && room.candidate !== socket.id) {
        console.warn(`[Signaling] [room:${resolvedRoomId}] REJECTED duplicate candidate: ${userId}`)
        socket.emit('room-locked', { message: 'This interview room already has an active candidate. Each link supports only one session at a time.' })
        socket.leave(roomId)
        if (resolvedRoomId !== roomId) socket.leave(resolvedRoomId)
        removeSocketFromRoom(roomId, socket.id)
        if (resolvedRoomId !== roomId) removeSocketFromRoom(resolvedRoomId, socket.id)
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

    // Notify others in both the original and resolved room
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

  // ── Register observer alias ─────────────────────────────────────────────
  socket.on('register-observer-alias', ({ observerRoomId, sourceRoomId }) => {
    if (!observerRoomId || !sourceRoomId || observerRoomId === sourceRoomId) return

    // Verify source room exists before creating alias
    const sourceRoom = getRoom(sourceRoomId)
    if (!sourceRoom) {
      console.warn(`[Signaling] register-observer-alias rejected: source room ${sourceRoomId} does not exist`)
      socket.emit('error', { message: 'Source room does not exist' })
      return
    }

    observerAliases.set(observerRoomId, sourceRoomId)

    // Only set candidate if not already set (prevent overwriting existing candidate)
    if (socket.data.role === 'candidate' && !sourceRoom.candidate) {
      sourceRoom.candidate = socket.id
      sourceRoom.candidateLocked = true
    }

    const aliasRoom = rooms[observerRoomId]
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

  // ── Helper: validate relay event ───────────────────────────────────────
  function validateRelay(roomId, requiredRole) {
    if (!roomId) return null
    if (requiredRole && socket.data.role !== requiredRole) {
      console.warn(`[Signaling] Event rejected: role "${socket.data.role}" != required "${requiredRole}" from ${socket.id}`)
      socket.emit('error', { message: `Requires ${requiredRole} role.` })
      return null
    }
    const resolvedRoomId = resolveRoomId(roomId)
    const room = getRoom(resolvedRoomId)
    if (!room) {
      console.warn(`[Signaling] Event rejected: room ${resolvedRoomId} does not exist`)
      return null
    }
    return { resolvedRoomId, room }
  }

  // ── Stream request: HR asks candidate to send WebRTC offer ─────────────
  socket.on('request-stream', ({ roomId }) => {
    if (socket.data.role !== 'hr') {
      console.warn(`[Signaling] request-stream rejected: non-HR role "${socket.data.role}" from ${socket.id}`)
      return
    }
    const result = validateRelay(roomId)
    if (!result) return
    const { resolvedRoomId, room } = result
    if (room.candidate) {
      console.log(`[Signaling] [room:${resolvedRoomId}] HR requested stream from candidate (alias: ${roomId})`)
      io.to(room.candidate).emit('send-stream', { to: socket.id })
    }
  })

  // ── WebRTC Signaling (with room membership validation) ─────────────────
  socket.on('offer', ({ to, offer }) => {
    if (!to || !offer) return
    if (!checkSocketRateLimit(socket.id, 'offer')) {
      console.warn(`[Signaling] offer rate limited for ${socket.id}`)
      return
    }
    // Verify target socket is in the same room
    const senderRoom = socket.data.roomId
    if (!senderRoom || !isSocketInRoom(senderRoom, to)) {
      console.warn(`[Signaling] offer rejected: target ${to} not in same room as ${socket.id}`)
      return
    }
    console.log(`[Signaling] Relay offer from ${socket.id} to ${to}`)
    io.to(to).emit('offer', { from: socket.id, offer })
  })

  socket.on('answer', ({ to, answer }) => {
    if (!to || !answer) return
    if (!checkSocketRateLimit(socket.id, 'answer')) {
      console.warn(`[Signaling] answer rate limited for ${socket.id}`)
      return
    }
    const senderRoom = socket.data.roomId
    if (!senderRoom || !isSocketInRoom(senderRoom, to)) {
      console.warn(`[Signaling] answer rejected: target ${to} not in same room as ${socket.id}`)
      return
    }
    console.log(`[Signaling] Relay answer from ${socket.id} to ${to}`)
    io.to(to).emit('answer', { from: socket.id, answer })
  })

  socket.on('ice-candidate', ({ to, candidate }) => {
    if (!to || !candidate) return
    if (!checkSocketRateLimit(socket.id, 'ice-candidate')) {
      console.warn(`[Signaling] ice-candidate rate limited for ${socket.id}`)
      return
    }
    const senderRoom = socket.data.roomId
    if (!senderRoom || !isSocketInRoom(senderRoom, to)) {
      console.warn(`[Signaling] ice-candidate rejected: target ${to} not in same room as ${socket.id}`)
      return
    }
    io.to(to).emit('ice-candidate', { from: socket.id, candidate })
  })

  // ── HR → Candidate WebRTC signaling (two-way audio/video) ──────────────
  socket.on('hr-offer', ({ to, offer }) => {
    if (socket.data.role !== 'hr') {
      console.warn(`[Signaling] hr-offer rejected: non-HR role "${socket.data.role}" from ${socket.id}`)
      return
    }
    if (!to || !offer) return
    if (!checkSocketRateLimit(socket.id, 'hr-offer')) {
      console.warn(`[Signaling] hr-offer rate limited for ${socket.id}`)
      return
    }
    // Verify target is in the same room
    const senderRoom = socket.data.roomId
    if (!senderRoom || !isSocketInRoom(senderRoom, to)) {
      console.warn(`[Signaling] hr-offer rejected: target ${to} not in same room as ${socket.id}`)
      return
    }
    console.log(`[WebRTC] [room:${senderRoom}] HR offer → candidate ${to}`)
    io.to(to).emit('hr-offer', { from: socket.id, offer })
  })

  socket.on('candidate-answer', ({ to, answer }) => {
    if (socket.data.role !== 'candidate') {
      console.warn(`[Signaling] candidate-answer rejected: non-candidate role "${socket.data.role}" from ${socket.id}`)
      return
    }
    if (!to || !answer) return
    if (!checkSocketRateLimit(socket.id, 'candidate-answer')) {
      console.warn(`[Signaling] candidate-answer rate limited for ${socket.id}`)
      return
    }
    const senderRoom = socket.data.roomId
    if (!senderRoom || !isSocketInRoom(senderRoom, to)) {
      console.warn(`[Signaling] candidate-answer rejected: target ${to} not in same room as ${socket.id}`)
      return
    }
    console.log(`[WebRTC] [room:${senderRoom}] Candidate answer → HR ${to}`)
    io.to(to).emit('candidate-answer', { from: socket.id, answer })
  })

  socket.on('hr-ice-candidate', ({ to, candidate }) => {
    if (socket.data.role !== 'hr') {
      console.warn(`[Signaling] hr-ice-candidate rejected: non-HR role "${socket.data.role}" from ${socket.id}`)
      return
    }
    if (!to || !candidate) return
    if (!checkSocketRateLimit(socket.id, 'hr-ice-candidate')) {
      console.warn(`[Signaling] hr-ice-candidate rate limited for ${socket.id}`)
      return
    }
    const senderRoom = socket.data.roomId
    if (!senderRoom || !isSocketInRoom(senderRoom, to)) {
      console.warn(`[Signaling] hr-ice-candidate rejected: target ${to} not in same room as ${socket.id}`)
      return
    }
    io.to(to).emit('hr-ice-candidate', { from: socket.id, candidate })
  })

  // ── HR speak request → candidate ──────────────────────────────────────
  socket.on('hr-speak-request', ({ roomId }) => {
    if (socket.data.role !== 'hr') {
      console.warn(`[Signaling] hr-speak-request rejected: non-HR role "${socket.data.role}" from ${socket.id}`)
      return
    }
    const result = validateRelay(roomId)
    if (!result) return
    const { resolvedRoomId, room } = result
    if (room.candidate) {
      console.log(`[Signaling] [room:${resolvedRoomId}] HR requested to speak (alias: ${roomId})`)
      io.to(room.candidate).emit('hr-speak-request', { hrSocketId: socket.id })
    }
  })

  // ── Candidate accepted HR speak → notify all observers, pause AI ─────
  socket.on('hr-speak-accept', ({ roomId }) => {
    if (socket.data.role !== 'candidate') {
      console.warn(`[Signaling] hr-speak-accept rejected: non-candidate role "${socket.data.role}" from ${socket.id}`)
      return
    }
    const result = validateRelay(roomId)
    if (!result) return
    const { resolvedRoomId, room } = result
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
      console.warn(`[Signaling] hr-speak-end rejected: non-HR role "${socket.data.role}" from ${socket.id}`)
      return
    }
    const result = validateRelay(roomId)
    if (!result) return
    const { resolvedRoomId, room } = result
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
    const result = validateRelay(roomId, 'candidate')
    if (!result) return
    const { room } = result
    room.observers.forEach(obsId => {
      io.to(obsId).emit('proctoring-alert', { warning, candidateId: socket.data.userId })
    })
  })

  // ── Interview state relay (candidate → HR) ────────────────────────────
  socket.on('interview-state', (data) => {
    if (!data || !data.roomId) return
    const result = validateRelay(data.roomId, 'candidate')
    if (!result) return
    const { room } = result
    room.observers.forEach(obsId => {
      io.to(obsId).emit('interview-state', data)
    })
  })

  // ── Candidate typing relay (candidate → HR) ──────────────────────────
  socket.on('candidate-typing', (data) => {
    if (!data || !data.roomId) return
    const result = validateRelay(data.roomId, 'candidate')
    if (!result) return
    const { room } = result
    room.observers.forEach(obsId => {
      io.to(obsId).emit('candidate-typing', data)
    })
  })

  // ── AI speaking relay (candidate → HR) ────────────────────────────────
  socket.on('ai-speaking', (data) => {
    if (!data || !data.roomId) return
    const result = validateRelay(data.roomId, 'candidate')
    if (!result) return
    const { room } = result
    room.observers.forEach(obsId => {
      io.to(obsId).emit('ai-speaking', data)
    })
  })

  // ── Answer submitted relay (candidate → HR) ──────────────────────────
  socket.on('answer-submitted', (data) => {
    if (!data || !data.roomId) return
    const result = validateRelay(data.roomId, 'candidate')
    if (!result) return
    const { room } = result
    room.observers.forEach(obsId => {
      io.to(obsId).emit('answer-submitted', data)
    })
  })

  // ── Proctoring state relay (candidate → HR) ──────────────────────────
  socket.on('proctoring-state', (data) => {
    if (!data || !data.roomId) return
    const result = validateRelay(data.roomId, 'candidate')
    if (!result) return
    const { room } = result
    room.observers.forEach(obsId => {
      io.to(obsId).emit('proctoring-state', data)
    })
  })

  // ── HR custom question relay (HR observer → candidate) ────────────────
  socket.on('hr-custom-question', (data) => {
    if (socket.data.role !== 'hr') {
      console.warn(`[Signaling] hr-custom-question rejected: non-HR role "${socket.data.role}" from ${socket.id}`)
      return
    }
    if (!data || !data.roomId) return
    const result = validateRelay(data.roomId)
    if (!result) return
    const { resolvedRoomId, room } = result
    if (room.candidate) {
      console.log(`[Signaling] [room:${resolvedRoomId}] HR sent custom question to candidate (alias: ${data.roomId})`)
      io.to(room.candidate).emit('hr-custom-question', data)
    }
  })

  // ── HR question audio relay (HR observer → candidate) ────────────────
  socket.on('hr-question-audio', (data) => {
    if (socket.data.role !== 'hr') {
      console.warn(`[Signaling] hr-question-audio rejected: non-HR role "${socket.data.role}" from ${socket.id}`)
      return
    }
    if (!data || !data.roomId) return
    const result = validateRelay(data.roomId)
    if (!result) return
    const { resolvedRoomId, room } = result
    if (room.candidate) {
      console.log(`[Signaling] [room:${resolvedRoomId}] HR sent question audio to candidate (alias: ${data.roomId})`)
      io.to(room.candidate).emit('hr-question-audio', data)
    }
  })

  // ── Interview ended ────────────────────────────────────────────────────
  socket.on('interview-ended', (data) => {
    if (socket.data.role !== 'hr' && socket.data.role !== 'candidate') {
      console.warn(`[Signaling] interview-ended rejected: invalid role "${socket.data.role}" from ${socket.id}`)
      return
    }
    const rawRoomId = typeof data === 'string' ? data : data?.roomId
    if (!rawRoomId || typeof rawRoomId !== 'string') {
      console.warn(`[Signaling] interview-ended rejected: invalid roomId from ${socket.id}`)
      return
    }
    const resolvedRoomId = resolveRoomId(rawRoomId)
    const room = getRoom(resolvedRoomId)
    if (!room) {
      console.warn(`[Signaling] interview-ended rejected: room ${resolvedRoomId} does not exist`)
      return
    }
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

    const room = getRoom(roomId)
    if (!room) return

    if (role === 'candidate' && room.candidate === socket.id) {
      room.candidate = null
      room.candidateLocked = false
    }
    if (role === 'hr' && room.hr === socket.id) {
      room.hr = null
    }
    room.observers.delete(socket.id)

    // Remove from roomSockets tracking
    const joinedRoomId = socket.data.joinedRoomId
    removeSocketFromRoom(roomId, socket.id)
    if (joinedRoomId && joinedRoomId !== roomId) {
      removeSocketFromRoom(joinedRoomId, socket.id)
    }

    // Notify both resolved room and original joined room
    const peerLeftPayload = { socketId: socket.id, role }
    socket.to(roomId).emit('peer-left', peerLeftPayload)
    if (joinedRoomId && joinedRoomId !== roomId) {
      socket.to(joinedRoomId).emit('peer-left', peerLeftPayload)
    }
    console.log(`[-] Socket disconnected: ${socket.id} (room: ${roomId}, joined: ${joinedRoomId}, role: ${role})`)

    // Clean up empty rooms
    if (!room.candidate && !room.hr && room.observers.size === 0) {
      delete rooms[roomId]
      roomSockets.delete(roomId)
      for (const [aliasRoomId, sourceRoomId] of observerAliases.entries()) {
        if (sourceRoomId === roomId) observerAliases.delete(aliasRoomId)
      }
    }
  })
})

// ─── Start server ───────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on http://localhost:${PORT}`)
  console.log(`   CORS origin: ${CLIENT_ORIGIN}`)
})