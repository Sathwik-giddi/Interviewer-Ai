'use strict'

const Redis = require('ioredis')

const ROOM_PREFIX = 'room:'
const ALIAS_PREFIX = 'alias:'
const ROOM_TTL_SECONDS = 86400 // 24 hours

let redis = null
let redisAvailable = false
let redisFailed = false
const REDIS_REQUIRED = process.env.NODE_ENV === 'production' || Boolean(process.env.REQUIRE_REDIS === '1')
const REDIS_CONFIGURED = Boolean(process.env.REDIS_URL)

const memoryCache = new Map()
const memoryAliases = new Map()

// Lua script for atomic addParticipant (fixes TOCTOU race condition)
// KEYS[1] = room key, ARGV[1] = socketId, ARGV[2] = role, ARGV[3] = uid
const ADD_PARTICIPANT_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
local room
if raw then
  room = cjson.decode(raw)
else
  room = { candidate = "", hr = "", observers = {}, candidateLocked = false }
end
if ARGV[2] == "candidate" then
  if room.candidateLocked == true and room.candidate ~= "" and room.candidate ~= cjson.null and room.candidate ~= ARGV[1] then
    return cjson.encode({ rejected = true, reason = "candidate_locked" })
  end
  room.candidate = ARGV[1]
  room.candidateLocked = true
elseif ARGV[2] == "hr" then
  room.hr = ARGV[1]
  -- add to observers if not already present
  local found = false
  for i, obs in ipairs(room.observers) do
    if obs == ARGV[1] then found = true break end
  end
  if not found then
    table.insert(room.observers, ARGV[1])
  end
end
redis.call('SETEX', KEYS[1], ARGV[4], cjson.encode(room))
return cjson.encode(room)
`

// Lua script for atomic removeParticipant
// KEYS[1] = room key, ARGV[1] = socketId, ARGV[2] = TTL
const REMOVE_PARTICIPANT_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return nil end
local room = cjson.decode(raw)
if room.candidate == ARGV[1] then
  room.candidate = ""
  room.candidateLocked = false
end
if room.hr == ARGV[1] then
  room.hr = ""
end
local newObservers = {}
for i, obs in ipairs(room.observers) do
  if obs ~= ARGV[1] then
    table.insert(newObservers, obs)
  end
end
room.observers = newObservers
redis.call('SETEX', KEYS[1], ARGV[2], cjson.encode(room))
return cjson.encode(room)
`

function usesRedisStore() {
  return Boolean(redis) || REDIS_CONFIGURED || REDIS_REQUIRED
}

function clearMemoryMirrors() {
  memoryCache.clear()
  memoryAliases.clear()
}

function markRedisFailed(reason) {
  if (!usesRedisStore()) return
  redisAvailable = false
  redisFailed = true
  clearMemoryMirrors()
  if (reason) {
    console.warn('[Redis] Marked unavailable:', reason)
  }
}

function markRedisReady() {
  redisAvailable = true
  redisFailed = false
  clearMemoryMirrors()
}

function redisUnavailableError(operation) {
  const err = new Error(`Redis unavailable; refusing roomStore.${operation}`)
  err.code = 'REDIS_UNAVAILABLE'
  err.redisRequired = REDIS_REQUIRED || REDIS_CONFIGURED
  return err
}

function assertRedisAvailable(operation) {
  if (usesRedisStore() && (!redis || !redisAvailable || redisFailed)) {
    throw redisUnavailableError(operation)
  }
}

function redisHealth() {
  return {
    redisRequired: REDIS_REQUIRED || REDIS_CONFIGURED,
    redisConfigured: REDIS_CONFIGURED,
    redisAvailable,
    redisFailed,
    redisStatus: redis?.status || 'not-configured',
  }
}

try {
  const redisUrl = process.env.REDIS_URL
  if (redisUrl) {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        if (times > 3) {
          markRedisFailed('retry limit exceeded; room mutations disabled until Redis reconnects')
          return null
        }
        return Math.min(times * 200, 2000)
      },
    })
    redis.on('connect', () => {
      console.log('[Redis] Connected')
    })
    redis.on('ready', () => {
      console.log('[Redis] Ready')
      markRedisReady()
    })
    redis.on('error', (err) => {
      if (redisAvailable) {
        console.warn('[Redis] Error:', err.message)
      }
      markRedisFailed(err.message)
    })
    redis.on('close', () => {
      markRedisFailed('connection closed')
    })
    redis.on('end', () => {
      markRedisFailed('connection ended')
    })
    redis.on('reconnecting', () => {
      markRedisFailed('reconnecting')
    })
  } else {
    if (REDIS_REQUIRED) {
      throw new Error('REDIS_URL is required in production')
    }
    console.log('[RoomStore] No REDIS_URL configured — using in-memory store only')
  }
} catch (err) {
  if (REDIS_REQUIRED) {
    console.error('[RoomStore] Redis initialization failed:', err.message)
    throw err
  }
  console.warn('[RoomStore] Redis initialization failed, falling back to in-memory:', err.message)
  redis = null
  redisAvailable = false
  redisFailed = false
}

async function getRoom(roomId) {
  if (usesRedisStore()) {
    assertRedisAvailable('getRoom')
    try {
      const raw = await redis.get(ROOM_PREFIX + roomId)
      if (!raw) return null
      const room = JSON.parse(raw)
      const deserialized = deserializeRoom(room)
      memoryCache.set(roomId, room)
      return deserialized
    } catch (err) {
      console.warn('[RoomStore] Redis getRoom failed:', err.message)
      markRedisFailed(err.message)
      throw err
    }
  }

  if (memoryCache.has(roomId)) {
    const cached = memoryCache.get(roomId)
    return deserializeRoom(cached)
  }

  return null
}

async function getOrCreateRoom(roomId) {
  const existing = await getRoom(roomId)
  if (existing) return existing

  const room = {
    candidate: null,
    hr: null,
    observers: [],
    candidateLocked: false,
  }
  await setRoom(roomId, room)
  return deserializeRoom(room)
}

async function setRoom(roomId, roomData) {
  const serializable = serializeRoom(roomData)

  if (usesRedisStore()) {
    assertRedisAvailable('setRoom')
    try {
      await redis.setex(ROOM_PREFIX + roomId, ROOM_TTL_SECONDS, JSON.stringify(serializable))
      memoryCache.set(roomId, serializable)
      return
    } catch (err) {
      console.warn('[RoomStore] Redis setRoom failed:', err.message)
      markRedisFailed(err.message)
      throw err
    }
  }

  memoryCache.set(roomId, serializable)
}

/**
 * Atomic addParticipant — uses Lua script in Redis, or in-memory with lock
 * Prevents TOCTOU race condition when two sockets join simultaneously
 */
async function addParticipant(roomId, socketId, role, uid) {
  if (usesRedisStore()) {
    try {
      assertRedisAvailable('addParticipant')
      const result = await redis.eval(
        ADD_PARTICIPANT_SCRIPT,
        1,
        ROOM_PREFIX + roomId,
        socketId,
        role,
        uid || '',
        String(ROOM_TTL_SECONDS)
      )
      // Invalidate memory cache so next getRoom reads fresh from Redis
      memoryCache.delete(roomId)
      const parsed = JSON.parse(result)
      if (parsed.rejected) {
        return { rejected: true, reason: parsed.reason, message: 'This interview room already has an active candidate. Each link supports only one session at a time.' }
      }
      const room = deserializeRoom(parsed)
      return room
    } catch (err) {
      console.warn('[RoomStore] Redis addParticipant Lua failed:', err.message)
      markRedisFailed(err.message)
      return { rejected: true, reason: 'redis_unavailable', message: 'Room service is temporarily unavailable. Please retry in a few moments.' }
    }
  }

  // In-memory fallback (single-process, no race condition possible)
  const room = await getRoom(roomId) || await getOrCreateRoom(roomId)
  if (role === 'candidate') {
    if (room.candidateLocked && room.candidate && room.candidate !== socketId) {
      return { rejected: true, reason: 'candidate_locked', message: 'This interview room already has an active candidate. Each link supports only one session at a time.' }
    }
    room.candidate = socketId
    room.candidateLocked = true
  } else if (role === 'hr') {
    room.hr = socketId
    room.observers.add(socketId)
  }
  await setRoom(roomId, room)
  return room
}

/**
 * Atomic removeParticipant — uses Lua script in Redis
 */
async function removeParticipant(roomId, socketId) {
  if (usesRedisStore()) {
    assertRedisAvailable('removeParticipant')
    try {
      const result = await redis.eval(
        REMOVE_PARTICIPANT_SCRIPT,
        1,
        ROOM_PREFIX + roomId,
        socketId,
        String(ROOM_TTL_SECONDS)
      )
      memoryCache.delete(roomId)
      if (!result) return null
      const room = deserializeRoom(JSON.parse(result))
      return room
    } catch (err) {
      console.warn('[RoomStore] Redis removeParticipant Lua failed:', err.message)
      markRedisFailed(err.message)
      throw err
    }
  }

  // In-memory fallback
  const room = await getRoom(roomId)
  if (!room) return null
  if (room.candidate === socketId) {
    room.candidate = null
    room.candidateLocked = false
  }
  if (room.hr === socketId) {
    room.hr = null
  }
  room.observers.delete(socketId)
  await setRoom(roomId, room)
  return room
}

async function deleteRoom(roomId) {
  if (usesRedisStore()) {
    assertRedisAvailable('deleteRoom')
    try {
      await redis.del(ROOM_PREFIX + roomId)
      memoryCache.delete(roomId)
      return
    } catch (err) {
      console.warn('[RoomStore] Redis deleteRoom failed:', err.message)
      markRedisFailed(err.message)
      throw err
    }
  }

  memoryCache.delete(roomId)
}

async function getAlias(aliasRoomId) {
  if (usesRedisStore()) {
    assertRedisAvailable('getAlias')
    try {
      const sourceRoomId = await redis.get(ALIAS_PREFIX + aliasRoomId)
      if (sourceRoomId) {
        memoryAliases.set(aliasRoomId, sourceRoomId)
        return sourceRoomId
      }
    } catch (err) {
      console.warn('[RoomStore] Redis getAlias failed:', err.message)
      markRedisFailed(err.message)
      throw err
    }
  }

  if (memoryAliases.has(aliasRoomId)) {
    return memoryAliases.get(aliasRoomId)
  }

  return null
}

async function setAlias(aliasRoomId, sourceRoomId) {
  if (usesRedisStore()) {
    assertRedisAvailable('setAlias')
    try {
      await redis.setex(ALIAS_PREFIX + aliasRoomId, ROOM_TTL_SECONDS, sourceRoomId)
      memoryAliases.set(aliasRoomId, sourceRoomId)
      return
    } catch (err) {
      console.warn('[RoomStore] Redis setAlias failed:', err.message)
      markRedisFailed(err.message)
      throw err
    }
  }

  memoryAliases.set(aliasRoomId, sourceRoomId)
}

async function deleteAlias(aliasRoomId) {
  if (usesRedisStore()) {
    assertRedisAvailable('deleteAlias')
    try {
      await redis.del(ALIAS_PREFIX + aliasRoomId)
      memoryAliases.delete(aliasRoomId)
      return
    } catch (err) {
      console.warn('[RoomStore] Redis deleteAlias failed:', err.message)
      markRedisFailed(err.message)
      throw err
    }
  }

  memoryAliases.delete(aliasRoomId)
}

async function deleteAliasesBySourceRoom(sourceRoomId) {
  if (usesRedisStore()) {
    assertRedisAvailable('deleteAliasesBySourceRoom')
    const stream = redis.scanStream({ match: `${ALIAS_PREFIX}*`, count: 100 })
    const aliasesToDelete = []

    for await (const keys of stream) {
      for (const key of keys) {
        const value = await redis.get(key)
        if (value === sourceRoomId) aliasesToDelete.push(key)
      }
    }

    if (aliasesToDelete.length) {
      await redis.del(...aliasesToDelete)
      aliasesToDelete.forEach(key => memoryAliases.delete(key.slice(ALIAS_PREFIX.length)))
    }
    return
  }

  const toDelete = []
  for (const [aliasRoomId, srcId] of memoryAliases.entries()) {
    if (srcId === sourceRoomId) toDelete.push(aliasRoomId)
  }
  for (const aliasRoomId of toDelete) {
    await deleteAlias(aliasRoomId)
  }
}

function serializeRoom(roomData) {
  return {
    candidate: roomData.candidate || null,
    hr: roomData.hr || null,
    observers: roomData.observers instanceof Set ? [...roomData.observers] : (roomData.observers || []),
    candidateLocked: roomData.candidateLocked || false,
  }
}

function deserializeRoom(data) {
  if (!data) return null
  return {
    candidate: data.candidate || null,
    hr: data.hr || null,
    observers: new Set(data.observers || []),
    candidateLocked: data.candidateLocked || false,
  }
}

module.exports = {
  getRoom,
  getOrCreateRoom,
  setRoom,
  deleteRoom,
  addParticipant,
  removeParticipant,
  getAlias,
  setAlias,
  deleteAlias,
  deleteAliasesBySourceRoom,
  getRedisClient: () => redis,
  getHealth: redisHealth,
  isRedisFailed: () => redisFailed,
  isRedisAvailable: () => redisAvailable,
  isRedisRequired: () => REDIS_REQUIRED || REDIS_CONFIGURED,
}
