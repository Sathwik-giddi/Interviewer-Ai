'use strict'
require('dotenv').config()

const express       = require('express')
const http          = require('http')
const { Server }    = require('socket.io')
const cors          = require('cors')
const rateLimit     = require('express-rate-limit')
const admin         = require('firebase-admin')
const { createAdapter } = require('@socket.io/redis-adapter')
const roomStore     = require('./roomStore')

// ─── Validate required environment variables ─────────────────────────────────
const REQUIRED_ENV = ['METERED_API_KEY', 'TURN_DOMAIN', 'TURN_USERNAME', 'TURN_CREDENTIAL']
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k])
if (missingEnv.length) {
  console.error(`[FATAL] Missing required environment variables: ${missingEnv.join(', ')}`)
  console.error('Set them in your .env file or deployment environment. Do NOT use hardcoded defaults.')
  process.exit(1)
}

const PORT           = process.env.PORT || 3000
const CLIENT_ORIGIN  = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const METERED_API_KEY   = process.env.METERED_API_KEY
const TURN_DOMAIN       = process.env.TURN_DOMAIN
const TURN_USERNAME     = process.env.TURN_USERNAME
const TURN_CREDENTIAL   = process.env.TURN_CREDENTIAL
const METERED_API_URL   = `https://${TURN_DOMAIN}/api/v1/turn/credentials?apiKey=${encodeURIComponent(METERED_API_KEY)}`

// ─── Firebase Admin SDK ──────────────────────────────────────────────────────
const FIREBASE_SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccount.json'

if (!admin.apps.length) {
  try {
    const fs = require('fs')
    if (fs.existsSync(FIREBASE_SERVICE_ACCOUNT_PATH)) {
      const serviceAccount = require(FIREBASE_SERVICE_ACCOUNT_PATH)
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
    } else {
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

function normalizeRole(value) {
  return value === 'hr' || value === 'candidate' ? value : null
}

async function getVerifiedUserRole(uid, decodedToken = {}) {
  const claimRole = normalizeRole(decodedToken.role)
  if (claimRole) return claimRole
  if (decodedToken.firebase?.sign_in_provider === 'anonymous') return 'candidate'

  try {
    const userDoc = await firestore.collection('users').doc(uid).get()
    if (!userDoc.exists) return null
    return normalizeRole(userDoc.data()?.role)
  } catch (err) {
    console.warn(`[Auth] Failed to load role for uid ${uid}:`, err.message)
    return null
  }
}

// ─── Express + Socket.io setup ──────────────────────────────────────────────
const app    = express()
const server = http.createServer(app)
const io     = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
})

app.use(cors({ origin: CLIENT_ORIGIN }))

// ─── Body parser with size limits (prevents 413 Payload Too Large) ──────────
const MAX_PAYLOAD_MB = parseInt(process.env.MAX_PAYLOAD_SIZE_MB || '10', 10)
const MAX_PAYLOAD_BYTES = MAX_PAYLOAD_MB + 'mb'
app.use(express.json({ limit: MAX_PAYLOAD_BYTES }))
app.use(express.urlencoded({ limit: MAX_PAYLOAD_BYTES, extended: true }))
console.log(`[Server] JSON body limit: ${MAX_PAYLOAD_BYTES}`)

async function configureRedisAdapter() {
  const redisUrl = process.env.REDIS_URL
  const isProduction = process.env.NODE_ENV === 'production'
  if (!redisUrl) {
    if (isProduction) {
      console.error('[FATAL] REDIS_URL is required in production for Socket.IO clustering.')
      process.exit(1)
    }
    console.warn('[Socket.IO] REDIS_URL not configured. Running single-instance only.')
    return
  }

  try {
    const pubClient = roomStore.getRedisClient()
    if (!pubClient) {
      throw new Error('roomStore Redis client is unavailable')
    }
    const subClient = pubClient.duplicate()
    await Promise.all([
      pubClient.status === 'ready' ? Promise.resolve() : pubClient.connect().catch(err => {
        if (err.message && err.message.includes('already connecting')) return
        throw err
      }),
      subClient.connect(),
    ])
    io.adapter(createAdapter(pubClient, subClient))
    console.log('[Socket.IO] Redis adapter enabled')
  } catch (err) {
    console.error('[FATAL] Failed to configure Socket.IO Redis adapter:', err.message)
    if (isProduction) process.exit(1)
  }
}

// ─── Rate limiting ──────────────────────────────────────────────────────────
const turnLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many TURN credential requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

async function authenticateRequest(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[AUTH] Request missing or invalid Authorization header')
    return null
  }
  try {
    const token = authHeader.slice(7)
    const decoded = await admin.auth().verifyIdToken(token)
    console.log(`[AUTH] Token verified for uid: ${decoded.uid}`)
    return decoded
  } catch (err) {
    console.warn('[AUTH] Token verification failed:', err.message)
    return null
  }
}

// ─── TURN credentials ───────────────────────────────────────────────────────
let turnCredentialsCache = {
  credentials: null,
  expiresAt: 0,
}
const CACHE_TTL_MS = 23 * 60 * 60 * 1000

async function getTurnCredentials() {
  const now = Date.now()

  if (turnCredentialsCache.credentials && turnCredentialsCache.expiresAt > now) {
    return turnCredentialsCache.credentials
  }

  try {
    const response = await fetch(METERED_API_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
      console.warn('[TURN] Metered API returned invalid iceServers:', JSON.stringify(iceServers).substring(0, 200))
    } else {
      console.warn('[TURN] Metered API returned status:', response.status)
      const errorBody = await response.text().catch(() => '')
      console.warn('[TURN] Metered API error body:', errorBody.substring(0, 200))
    }
  } catch (err) {
    console.warn('[TURN] Dynamic API failed:', err.message)
  }

  return null
}

// ─── Health check ───────────────────────────────────────────────────────────
app.get('/health', (_, res) => {
  const roomStoreHealth = roomStore.getHealth()
  if (roomStoreHealth.redisRequired && (!roomStoreHealth.redisAvailable || roomStoreHealth.redisFailed)) {
    return res.status(503).json({
      status: 'degraded',
      roomStore: roomStoreHealth,
    })
  }
  return res.json({
    status: 'ok',
    roomStore: roomStoreHealth,
  })
})

// ─── Custom token endpoint for demo HR ──────────────────────────────────────
const DEMO_HR_UID = process.env.DEMO_HR_UID || 'hr-admin-001'
const DEMO_HR_SECRET = process.env.DEMO_HR_SECRET

app.post('/api/auth/custom-token', async (req, res) => {
  const { secret } = req.body || {}
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
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      console.warn('[TURN] Unauthenticated request — returning 401')
      return res.status(401).json({ error: 'Authentication required' })
    }
    console.log('[TURN] Serving credentials to uid:', user.uid)
    const iceServers = await getTurnCredentials()
    if (!iceServers) {
      console.error('[TURN] No ICE servers available from Metered API')
      return res.status(500).json({
        error: 'TURN service unavailable',
        message: 'Failed to retrieve TURN credentials. Please try again later.',
      })
    }
    console.log('[TURN] Returning', iceServers.length, 'ICE servers to uid:', user.uid)
    res.json({ iceServers, expiresAt: turnCredentialsCache.expiresAt })
  } catch (err) {
    console.error('[TURN] Unexpected error:', err.message)
    res.status(500).json({ error: 'TURN service unavailable' })
  }
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
  const user = await authenticateRequest(req)
  if (!user) return res.status(401).json({ error: 'Authentication required' })
  turnCredentialsCache = { credentials: null, expiresAt: 0 }
  const iceServers = await getTurnCredentials()
  if (!iceServers) {
    return res.status(500).json({ error: 'Failed to refresh credentials' })
  }
  res.json({ success: true, expiresAt: turnCredentialsCache.expiresAt })
})

// ─── Bug Report endpoint (with chunking for AI processing) ──────────────────
const BUG_REPORT_MAX_CHUNK = 8000 // characters per chunk for AI model context window

app.post('/api/bug-report', turnLimiter, async (req, res) => {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { logs, errorStack, userAction, sessionId, pageUrl, userAgent } = req.body

    if (!logs && !errorStack && !userAction) {
      return res.status(400).json({ error: 'At least one of logs, errorStack, or userAction is required' })
    }

    // Build full text from report fields
    const parts = []
    if (userAction)  parts.push(`User Action: ${userAction}`)
    if (errorStack)   parts.push(`Error Stack: ${errorStack}`)
    if (logs)         parts.push(`Logs: ${logs}`)
    if (pageUrl)      parts.push(`Page URL: ${pageUrl}`)
    if (userAgent)    parts.push(`User Agent: ${userAgent}`)
    if (sessionId)    parts.push(`Session ID: ${sessionId}`)

    const fullText = parts.join('\n\n')

    // If within single-chunk limit, process directly
    if (fullText.length <= BUG_REPORT_MAX_CHUNK) {
      // Store in Firestore for tracking (non-blocking)
      try {
        const reportId = `bug-${Date.now()}-${user.uid.slice(0, 8)}`
        await firestore.collection('bugReports').doc(reportId).set({
          reportId,
          uid: user.uid,
          logs: logs || null,
          errorStack: errorStack || null,
          userAction: userAction || null,
          sessionId: sessionId || null,
          pageUrl: pageUrl || null,
          userAgent: userAgent || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          truncated: false,
        })
      } catch (dbErr) {
        console.warn('[BugReport] Firestore save failed:', dbErr.message)
      }

      console.log(`[BugReport] Report received from uid: ${user.uid} (${fullText.length} chars)`)
      return res.json({
        received: true,
        message: 'Bug report submitted successfully.',
        characterCount: fullText.length,
        truncated: false,
      })
    }

    // If text exceeds chunk limit, process first chunk and note truncation
    const firstChunk = fullText.slice(0, BUG_REPORT_MAX_CHUNK)
    const totalChunks = Math.ceil(fullText.length / BUG_REPORT_MAX_CHUNK)

    // Store truncated report in Firestore (non-blocking)
    try {
      const reportId = `bug-${Date.now()}-${user.uid.slice(0, 8)}`
      await firestore.collection('bugReports').doc(reportId).set({
        reportId,
        uid: user.uid,
        logs: (logs || '').slice(0, BUG_REPORT_MAX_CHUNK),
        errorStack: (errorStack || '').slice(0, BUG_REPORT_MAX_CHUNK),
        userAction: userAction || null,
        sessionId: sessionId || null,
        pageUrl: pageUrl || null,
        userAgent: userAgent || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        truncated: true,
        totalChunks,
        originalLength: fullText.length,
      })
    } catch (dbErr) {
      console.warn('[BugReport] Firestore save failed:', dbErr.message)
    }

    console.log(`[BugReport] Report received from uid: ${user.uid} — truncated ${fullText.length} chars to ${firstChunk.length} (chunk 1/${totalChunks})`)

    res.json({
      received: true,
      message: `Bug report submitted. Large payload truncated to first chunk (${totalChunks} total chunks).`,
      characterCount: fullText.length,
      processedChars: firstChunk.length,
      truncated: true,
      totalChunks,
    })
  } catch (err) {
    console.error('[BugReport] Error processing report:', err.message)
    res.status(500).json({ error: 'Failed to process bug report' })
  }
})

// ─── Room state (backed by roomStore — Redis + in-memory cache) ─────────────
/** roomSockets: roomId -> Set(socketId) — tracks all sockets in each room (connection-scoped, kept in-memory) */
const roomSockets = new Map()

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

async function resolveRoomId(roomId) {
  return (await roomStore.getAlias(roomId)) || roomId
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
    return false
  }
  return true
}

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of socketRateLimits.entries()) {
    if (now - entry.windowStart > 2000) {
      socketRateLimits.delete(key)
    }
  }
}, 60 * 1000)

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
    socket.data.decodedToken = decoded
    socket.data.userRole = await getVerifiedUserRole(decoded.uid, decoded)

    console.log(`[Auth] Socket ${socket.id} authenticated as uid: ${decoded.uid}, role: ${socket.data.userRole}`)
    next()
  } catch (err) {
    console.warn(`[Auth] Socket ${socket.id} rejected: invalid token (${err.message})`)
    next(new Error('Invalid authentication token'))
  }
})

// ─── Socket event handlers ──────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id} (uid: ${socket.data.uid})`)

  // Track which rooms this socket is in (for cleanup on disconnect)
  socket.data.joinedRooms = new Set()

  // ── Join room ──────────────────────────────────────────────────────────
  socket.on('join-room', async ({ roomId, userId, role }) => {
    if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
      console.warn(`[Signaling] join-room rejected: invalid roomId from ${socket.id}`)
      socket.emit('error', { message: 'Invalid roomId' })
      return
    }

    const verifiedRole = await getVerifiedUserRole(socket.data.uid, socket.data.decodedToken)
    if (!verifiedRole) {
      console.warn(`[Signaling] join-room rejected: role cannot be verified for uid ${socket.data.uid}`)
      socket.emit('error', { message: 'Authenticated user role is not verified.' })
      return
    }

    const requestedRole = role === 'hr' || role === 'candidate' ? role : null
    if (requestedRole && requestedRole !== verifiedRole) {
      console.warn(`[Signaling] join-room rejected: role mismatch for uid ${socket.data.uid} (claimed: ${requestedRole}, actual: ${verifiedRole})`)
      socket.emit('error', { message: 'Role mismatch with authenticated user.' })
      return
    }

    const effectiveRole = verifiedRole
    const effectiveUserId = socket.data.uid

    socket.join(roomId)
    const resolvedRoomId = await resolveRoomId(roomId)
    if (resolvedRoomId !== roomId) {
      socket.join(resolvedRoomId)
    }

    socket.data.roomId = resolvedRoomId
    socket.data.joinedRoomId = roomId
    socket.data.userId = effectiveUserId
    socket.data.role = effectiveRole

    addSocketToRoom(roomId, socket.id)
    if (resolvedRoomId !== roomId) {
      addSocketToRoom(resolvedRoomId, socket.id)
    }

    // Track rooms for disconnect cleanup
    socket.data.joinedRooms.add(roomId)
    if (resolvedRoomId !== roomId) {
      socket.data.joinedRooms.add(resolvedRoomId)
    }

    // Use atomic addParticipant to avoid race conditions
    const room = await roomStore.addParticipant(resolvedRoomId, socket.id, effectiveRole, effectiveUserId)

    if (room?.rejected) {
      socket.emit('room-locked', { message: room.message || 'This interview room already has an active candidate.' })
      socket.leave(roomId)
      if (resolvedRoomId !== roomId) socket.leave(resolvedRoomId)
      removeSocketFromRoom(roomId, socket.id)
      if (resolvedRoomId !== roomId) removeSocketFromRoom(resolvedRoomId, socket.id)
      socket.data.joinedRooms.delete(roomId)
      if (resolvedRoomId !== roomId) socket.data.joinedRooms.delete(resolvedRoomId)
      return
    }

    // Check if candidate is locked out (another candidate already in room)
    if (effectiveRole === 'candidate') {
      // Re-fetch room to check lock status (addParticipant may have been overwritten by another concurrent join)
      const currentRoom = await roomStore.getRoom(resolvedRoomId)
      if (currentRoom && currentRoom.candidate && currentRoom.candidate !== socket.id && currentRoom.candidateLocked) {
        console.warn(`[Signaling] [room:${resolvedRoomId}] REJECTED duplicate candidate: ${effectiveUserId}`)
        socket.emit('room-locked', { message: 'This interview room already has an active candidate. Each link supports only one session at a time.' })
        socket.leave(roomId)
        if (resolvedRoomId !== roomId) socket.leave(resolvedRoomId)
        removeSocketFromRoom(roomId, socket.id)
        if (resolvedRoomId !== roomId) removeSocketFromRoom(resolvedRoomId, socket.id)
        socket.data.joinedRooms.delete(roomId)
        if (resolvedRoomId !== roomId) socket.data.joinedRooms.delete(resolvedRoomId)
        return
      }
    }

    console.log(`[Signaling] [room:${resolvedRoomId}] ${effectiveRole} joined: ${effectiveUserId} (alias: ${roomId})`)

    const peerJoinedPayload = { userId: effectiveUserId, role: effectiveRole, socketId: socket.id }
    socket.to(roomId).emit('peer-joined', peerJoinedPayload)
    if (resolvedRoomId !== roomId) {
      socket.to(resolvedRoomId).emit('peer-joined', peerJoinedPayload)
    }

    const finalRoom = await roomStore.getRoom(resolvedRoomId)
    socket.emit('room-state', {
      hasCandidate: !!finalRoom?.candidate,
      observerCount: finalRoom?.observers?.size || 0,
    })
  })

  // ── Register observer alias ─────────────────────────────────────────────
  socket.on('register-observer-alias', async ({ observerRoomId, sourceRoomId }) => {
    if (!observerRoomId || !sourceRoomId || observerRoomId === sourceRoomId) return
    if (socket.data.role !== 'candidate') {
      console.warn(`[Signaling] register-observer-alias rejected: non-candidate role "${socket.data.role}" from ${socket.id}`)
      socket.emit('error', { message: 'Only the candidate may register an observer alias.' })
      return
    }
    if (!isSocketInRoom(sourceRoomId, socket.id)) {
      console.warn(`[Signaling] register-observer-alias rejected: socket ${socket.id} is not in source room ${sourceRoomId}`)
      socket.emit('error', { message: 'Not a participant in source room.' })
      return
    }

    const sourceRoom = await roomStore.getRoom(sourceRoomId)
    if (!sourceRoom) {
      console.warn(`[Signaling] register-observer-alias rejected: source room ${sourceRoomId} does not exist`)
      socket.emit('error', { message: 'Source room does not exist' })
      return
    }

    await roomStore.setAlias(observerRoomId, sourceRoomId)

    if (socket.data.role === 'candidate' && !sourceRoom.candidate) {
      sourceRoom.candidate = socket.id
      sourceRoom.candidateLocked = true
    }

    const aliasRoom = await roomStore.getRoom(observerRoomId)
    if (aliasRoom) {
      if (aliasRoom.hr && !sourceRoom.hr) sourceRoom.hr = aliasRoom.hr
      aliasRoom.observers.forEach((observerId) => sourceRoom.observers.add(observerId))
      await roomStore.deleteRoom(observerRoomId)
    }

    await roomStore.setRoom(sourceRoomId, sourceRoom)

    sourceRoom.observers.forEach((observerId) => {
      io.to(observerId).emit('room-state', {
        hasCandidate: !!sourceRoom.candidate,
        observerCount: sourceRoom.observers.size,
      })
    })
  })

  // ── Helper: validate relay event ───────────────────────────────────────
  async function validateRelay(roomId, requiredRole) {
    if (!roomId) return null
    if (requiredRole && socket.data.role !== requiredRole) {
      console.warn(`[Signaling] Event rejected: role "${socket.data.role}" != required "${requiredRole}" from ${socket.id}`)
      socket.emit('error', { message: `Requires ${requiredRole} role.` })
      return null
    }
    const resolvedRoomId = await resolveRoomId(roomId)
    const room = await roomStore.getRoom(resolvedRoomId)
    if (!room) {
      console.warn(`[Signaling] Event rejected: room ${resolvedRoomId} does not exist`)
      return null
    }
    // Validate socket is a participant in the room (Error 15 fix)
    if (!isSocketInRoom(resolvedRoomId, socket.id) && !isSocketInRoom(roomId, socket.id)) {
      console.warn(`[Signaling] Event rejected: socket ${socket.id} is not in room ${resolvedRoomId}`)
      socket.emit('error', { message: 'Not a participant in this room.' })
      return null
    }
    return { resolvedRoomId, room }
  }

  // ── Stream request: HR asks candidate to send WebRTC offer ─────────────
  socket.on('request-stream', async ({ roomId }) => {
    if (socket.data.role !== 'hr') {
      console.warn(`[Signaling] request-stream rejected: non-HR role "${socket.data.role}" from ${socket.id}`)
      return
    }
    const result = await validateRelay(roomId)
    if (!result) return
    const { resolvedRoomId, room } = result
    if (room.candidate) {
      console.log(`[Signaling] [room:${resolvedRoomId}] HR requested stream from candidate (alias: ${roomId})`)
      io.to(room.candidate).emit('send-stream', { to: socket.id })
    } else {
      console.warn(`[Signaling] [room:${resolvedRoomId}] HR requested stream but no candidate in room`)
    }
  })

  // ── WebRTC Signaling (with room membership validation) ─────────────────
  socket.on('offer', ({ to, offer }) => {
    if (!to || !offer) return
    if (!checkSocketRateLimit(socket.id, 'offer')) {
      console.warn(`[Signaling] offer rate limited for ${socket.id}`)
      return
    }
    const senderRoom = socket.data.roomId
    if (!senderRoom || !isSocketInRoom(senderRoom, to)) {
      console.warn(`[Signaling] offer rejected: target ${to} not in same room as ${socket.id}`)
      return
    }
    console.log(`[Signaling] Relay offer from ${socket.id} (role: ${socket.data.role}) to ${to}`)
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
    console.log(`[Signaling] Relay answer from ${socket.id} (role: ${socket.data.role}) to ${to}`)
    io.to(to).emit('answer', { from: socket.id, answer })
  })

  // Error 9 fix: ICE candidates are sent peer-to-peer (to a specific socket), not broadcast
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
  socket.on('hr-speak-request', async ({ roomId }) => {
    if (socket.data.role !== 'hr') {
      console.warn(`[Signaling] hr-speak-request rejected: non-HR role "${socket.data.role}" from ${socket.id}`)
      return
    }
    const result = await validateRelay(roomId)
    if (!result) return
    const { resolvedRoomId, room } = result
    if (room.candidate) {
      console.log(`[Signaling] [room:${resolvedRoomId}] HR requested to speak (alias: ${roomId})`)
      io.to(room.candidate).emit('hr-speak-request', { hrSocketId: socket.id })
    }
  })

  // ── Candidate accepted HR speak → notify all observers, pause AI ─────
  socket.on('hr-speak-accept', async ({ roomId }) => {
    if (socket.data.role !== 'candidate') {
      console.warn(`[Signaling] hr-speak-accept rejected: non-candidate role "${socket.data.role}" from ${socket.id}`)
      return
    }
    const result = await validateRelay(roomId)
    if (!result) return
    const { resolvedRoomId, room } = result
    console.log(`[Signaling] [room:${resolvedRoomId}] Candidate accepted HR speak (alias: ${roomId})`)

    room.observers.forEach(obsId => {
      io.to(obsId).emit('hr-speak-accepted')
    })
    socket.emit('hr-speak-accepted')

    socket.to(resolvedRoomId).emit('ai-pause')
    if (resolvedRoomId !== roomId) {
      socket.to(roomId).emit('ai-pause')
    }
  })

  // ── HR ended speaking → resume AI ─────────────────────────────────────
  socket.on('hr-speak-end', async ({ roomId }) => {
    if (socket.data.role !== 'hr') {
      console.warn(`[Signaling] hr-speak-end rejected: non-HR role "${socket.data.role}" from ${socket.id}`)
      return
    }
    const result = await validateRelay(roomId)
    if (!result) return
    const { resolvedRoomId, room } = result
    console.log(`[Signaling] [room:${resolvedRoomId}] HR ended speaking — resuming AI (alias: ${roomId})`)
    if (room.candidate) {
      io.to(room.candidate).emit('hr-speak-end')
    }
    socket.to(resolvedRoomId).emit('ai-resume')
    if (resolvedRoomId !== roomId) {
      socket.to(roomId).emit('ai-resume')
    }
  })

  // ── Proctoring alert relay (candidate → HR observer) ──────────────────
  socket.on('proctoring-alert', async ({ roomId, warning }) => {
    const result = await validateRelay(roomId, 'candidate')
    if (!result) return
    const { room } = result
    room.observers.forEach(obsId => {
      io.to(obsId).emit('proctoring-alert', { warning, candidateId: socket.data.userId })
    })
  })

  // ── Interview state relay (candidate → HR) ────────────────────────────
  socket.on('interview-state', async (data) => {
    if (!data || !data.roomId) return
    const result = await validateRelay(data.roomId, 'candidate')
    if (!result) return
    const { room } = result
    room.observers.forEach(obsId => {
      io.to(obsId).emit('interview-state', data)
    })
  })

  // ── Candidate typing relay (candidate → HR) ──────────────────────────
  socket.on('candidate-typing', async (data) => {
    if (!data || !data.roomId) return
    const result = await validateRelay(data.roomId, 'candidate')
    if (!result) return
    const { room } = result
    room.observers.forEach(obsId => {
      io.to(obsId).emit('candidate-typing', data)
    })
  })

  // ── AI speaking relay (candidate → HR) ────────────────────────────────
  socket.on('ai-speaking', async (data) => {
    if (!data || !data.roomId) return
    const result = await validateRelay(data.roomId, 'candidate')
    if (!result) return
    const { room } = result
    room.observers.forEach(obsId => {
      io.to(obsId).emit('ai-speaking', data)
    })
  })

  // ── Answer submitted relay (candidate → HR) ──────────────────────────
  socket.on('answer-submitted', async (data) => {
    if (!data || !data.roomId) return
    const result = await validateRelay(data.roomId, 'candidate')
    if (!result) return
    const { room } = result
    room.observers.forEach(obsId => {
      io.to(obsId).emit('answer-submitted', data)
    })
  })

  // ── Proctoring state relay (candidate → HR) ──────────────────────────
  socket.on('proctoring-state', async (data) => {
    if (!data || !data.roomId) return
    const result = await validateRelay(data.roomId, 'candidate')
    if (!result) return
    const { room } = result
    room.observers.forEach(obsId => {
      io.to(obsId).emit('proctoring-state', data)
    })
  })

  // ── HR custom question relay (HR observer → candidate) ────────────────
  socket.on('hr-custom-question', async (data) => {
    if (socket.data.role !== 'hr') {
      console.warn(`[Signaling] hr-custom-question rejected: non-HR role "${socket.data.role}" from ${socket.id}`)
      return
    }
    if (!data || !data.roomId) return
    const result = await validateRelay(data.roomId)
    if (!result) return
    const { resolvedRoomId, room } = result
    if (room.candidate) {
      console.log(`[Signaling] [room:${resolvedRoomId}] HR sent custom question to candidate (alias: ${data.roomId})`)
      io.to(room.candidate).emit('hr-custom-question', data)
    }
  })

  // ── HR question audio relay (HR observer → candidate) ────────────────
  socket.on('hr-question-audio', async (data) => {
    if (socket.data.role !== 'hr') {
      console.warn(`[Signaling] hr-question-audio rejected: non-HR role "${socket.data.role}" from ${socket.id}`)
      return
    }
    if (!data || !data.roomId) return
    const result = await validateRelay(data.roomId)
    if (!result) return
    const { resolvedRoomId, room } = result
    if (room.candidate) {
      console.log(`[Signaling] [room:${resolvedRoomId}] HR sent question audio to candidate (alias: ${data.roomId})`)
      io.to(room.candidate).emit('hr-question-audio', data)
    }
  })

  // ── Interview ended ────────────────────────────────────────────────────
  socket.on('interview-ended', async (data) => {
    if (socket.data.role !== 'hr' && socket.data.role !== 'candidate') {
      console.warn(`[Signaling] interview-ended rejected: invalid role "${socket.data.role}" from ${socket.id}`)
      return
    }
    const rawRoomId = typeof data === 'string' ? data : data?.roomId
    if (!rawRoomId || typeof rawRoomId !== 'string') {
      console.warn(`[Signaling] interview-ended rejected: invalid roomId from ${socket.id}`)
      return
    }
    const resolvedRoomId = await resolveRoomId(rawRoomId)
    const room = await roomStore.getRoom(resolvedRoomId)
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
  socket.on('disconnect', async () => {
    const { roomId, role, joinedRoomId, joinedRooms } = socket.data
    if (!roomId && !joinedRooms?.size) return

    // Clean up all rooms this socket was part of (Error 8 fix)
    const roomsToClean = joinedRooms?.size
      ? [...joinedRooms]
      : [roomId, joinedRoomId].filter(Boolean)

    for (const rId of roomsToClean) {
      try {
        const room = await roomStore.removeParticipant(rId, socket.id)
        if (!room) continue

        // If room is empty, delete it
        if (!room.candidate && !room.hr && room.observers.size === 0) {
          await roomStore.deleteRoom(rId)
          await roomStore.deleteAliasesBySourceRoom(rId)
          roomSockets.delete(rId)
        }

        // Notify others in the room
        const peerLeftPayload = { socketId: socket.id, role }
        socket.to(rId).emit('peer-left', peerLeftPayload)
      } catch (err) {
        console.warn(`[Disconnect] Error cleaning room ${rId}:`, err.message)
      }

      removeSocketFromRoom(rId, socket.id)
    }

    console.log(`[-] Socket disconnected: ${socket.id} (room: ${roomId}, joined: ${joinedRoomId}, role: ${role})`)

    for (const key of socketRateLimits.keys()) {
      if (key.startsWith(socket.id + ":")) {
        socketRateLimits.delete(key)
      }
    }
  })
})

// ─── Start server ───────────────────────────────────────────────────────────
configureRedisAdapter().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Signaling server running on http://localhost:${PORT}`)
    console.log(`   CORS origin: ${CLIENT_ORIGIN}`)
  })
})
