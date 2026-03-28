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
 * Room structure:
 *   rooms[roomId] = {
 *     candidate: socketId | null,
 *     hr:        socketId | null,
 *     observers: Set<socketId>,
 *   }
 */
const rooms = {}

function getRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = { candidate: null, hr: null, observers: new Set(), candidateLocked: false }
  }
  return rooms[roomId]
}

io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`)

  // ── Join room ──────────────────────────────────────────────────────────
  socket.on('join-room', ({ roomId, userId, role }) => {
    socket.join(roomId)
    socket.data.roomId = roomId
    socket.data.userId = userId
    socket.data.role   = role

    const room = getRoom(roomId)

    if (role === 'candidate') {
      // Enforce single candidate per room
      if (room.candidateLocked && room.candidate && room.candidate !== socket.id) {
        console.log(`[room:${roomId}] REJECTED duplicate candidate: ${userId}`)
        socket.emit('room-locked', { message: 'This interview room already has an active candidate. Each link supports only one session at a time.' })
        socket.leave(roomId)
        return
      }
      room.candidate = socket.id
      room.candidateLocked = true
      console.log(`[room:${roomId}] Candidate joined: ${userId}`)
    } else if (role === 'hr') {
      room.hr = socket.id
      console.log(`[room:${roomId}] HR joined (observer): ${userId}`)
      room.observers.add(socket.id)
    }

    // Notify others in the room that a new peer joined
    socket.to(roomId).emit('peer-joined', { userId, role, socketId: socket.id })
    socket.emit('room-state', {
      hasCandidate: !!room.candidate,
      observerCount: room.observers.size,
    })
  })

  // ── Stream request: HR asks candidate to send WebRTC offer ──────────
  socket.on('request-stream', ({ roomId }) => {
    const room = getRoom(roomId)
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
    const room = getRoom(roomId)
    if (room.candidate) {
      console.log(`[room:${roomId}] HR requested to speak`)
      io.to(room.candidate).emit('hr-speak-request', { hrSocketId: socket.id })
    }
  })

  // ── Candidate accepted HR speak → notify HR, tell AI to pause ─────────
  socket.on('hr-speak-accept', ({ roomId }) => {
    const room = getRoom(roomId)
    if (room.hr) {
      console.log(`[room:${roomId}] Candidate accepted HR speak`)
      io.to(room.hr).emit('hr-speak-accepted')
    }
    // Broadcast to the whole room to pause AI
    socket.to(roomId).emit('ai-pause')
  })

  // ── HR ended speaking → resume AI ─────────────────────────────────────
  socket.on('hr-speak-end', ({ roomId }) => {
    const room = getRoom(roomId)
    console.log(`[room:${roomId}] HR ended speaking — resuming AI`)
    // Notify candidate to resume
    if (room.candidate) {
      io.to(room.candidate).emit('hr-speak-end')
    }
    socket.to(roomId).emit('ai-resume')
  })

  // ── Proctoring alert relay (candidate → HR observer) ──────────────────
  socket.on('proctoring-alert', ({ roomId, warning }) => {
    const room = getRoom(roomId)
    room.observers.forEach(obsId => {
      io.to(obsId).emit('proctoring-alert', { warning, candidateId: socket.data.userId })
    })
  })

  // ── Interview state relay (candidate → HR) ────────────────────────────
  socket.on('interview-state', (data) => {
    const room = getRoom(data.roomId)
    room.observers.forEach(obsId => {
      io.to(obsId).emit('interview-state', data)
    })
  })

  // ── Candidate typing relay (candidate → HR) ──────────────────────────
  socket.on('candidate-typing', (data) => {
    const room = getRoom(data.roomId)
    room.observers.forEach(obsId => {
      io.to(obsId).emit('candidate-typing', data)
    })
  })

  // ── AI speaking relay (candidate → HR) ────────────────────────────────
  socket.on('ai-speaking', (data) => {
    const room = getRoom(data.roomId)
    room.observers.forEach(obsId => {
      io.to(obsId).emit('ai-speaking', data)
    })
  })

  // ── Answer submitted relay (candidate → HR) ──────────────────────────
  socket.on('answer-submitted', (data) => {
    const room = getRoom(data.roomId)
    room.observers.forEach(obsId => {
      io.to(obsId).emit('answer-submitted', data)
    })
  })

  // ── Proctoring state relay (candidate → HR) — mood, objects, warnings
  socket.on('proctoring-state', (data) => {
    const room = getRoom(data.roomId)
    room.observers.forEach(obsId => {
      io.to(obsId).emit('proctoring-state', data)
    })
  })

  // ── HR custom question relay (HR observer → candidate) ────────────────
  socket.on('hr-custom-question', (data) => {
    const room = getRoom(data.roomId)
    if (room.candidate) {
      console.log(`[room:${data.roomId}] HR sent custom question to candidate`)
      io.to(room.candidate).emit('hr-custom-question', data)
    }
  })

  // ── HR question audio relay (HR observer → candidate) ────────────────
  socket.on('hr-question-audio', (data) => {
    const room = getRoom(data.roomId)
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
    }
  })
})

server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on http://localhost:${PORT}`)
  console.log(`   CORS origin: ${CLIENT_ORIGIN}`)
})
