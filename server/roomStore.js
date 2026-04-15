'use strict'

const Redis = require('ioredis')

const ROOM_PREFIX = 'room:'
const ALIAS_PREFIX = 'alias:'

let redis = null
let redisAvailable = false

const memoryCache = new Map()
const memoryAliases = new Map()

try {
  const redisUrl = process.env.REDIS_URL
  if (redisUrl) {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('[Redis] Giving up after 3 retries. Falling back to in-memory.')
          redisAvailable = false
          return null
        }
        return Math.min(times * 200, 2000)
      },
    })
    redis.on('connect', () => {
      console.log('[Redis] Connected')
      redisAvailable = true
    })
    redis.on('error', (err) => {
      if (redisAvailable) {
        console.warn('[Redis] Error:', err.message)
      }
      redisAvailable = false
    })
  } else {
    console.log('[RoomStore] No REDIS_URL configured — using in-memory store only')
  }
} catch (err) {
  console.warn('[RoomStore] Redis initialization failed, falling back to in-memory:', err.message)
  redis = null
  redisAvailable = false
}

async function getRoom(roomId) {
  if (memoryCache.has(roomId)) {
    const cached = memoryCache.get(roomId)
    return deserializeRoom(cached)
  }

  if (redisAvailable && redis) {
    try {
      const raw = await redis.get(ROOM_PREFIX + roomId)
      if (!raw) return null
      const room = JSON.parse(raw)
      const deserialized = deserializeRoom(room)
      memoryCache.set(roomId, room)
      return deserialized
    } catch (err) {
      console.warn('[RoomStore] Redis getRoom failed:', err.message)
    }
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

  memoryCache.set(roomId, serializable)

  if (redisAvailable && redis) {
    try {
      await redis.set(ROOM_PREFIX + roomId, JSON.stringify(serializable), 'EX', 86400)
    } catch (err) {
      console.warn('[RoomStore] Redis setRoom failed:', err.message)
    }
  }
}

async function deleteRoom(roomId) {
  memoryCache.delete(roomId)

  if (redisAvailable && redis) {
    try {
      await redis.del(ROOM_PREFIX + roomId)
    } catch (err) {
      console.warn('[RoomStore] Redis deleteRoom failed:', err.message)
    }
  }
}

async function getAlias(aliasRoomId) {
  if (memoryAliases.has(aliasRoomId)) {
    return memoryAliases.get(aliasRoomId)
  }

  if (redisAvailable && redis) {
    try {
      const sourceRoomId = await redis.get(ALIAS_PREFIX + aliasRoomId)
      if (sourceRoomId) {
        memoryAliases.set(aliasRoomId, sourceRoomId)
        return sourceRoomId
      }
    } catch (err) {
      console.warn('[RoomStore] Redis getAlias failed:', err.message)
    }
  }

  return null
}

async function setAlias(aliasRoomId, sourceRoomId) {
  memoryAliases.set(aliasRoomId, sourceRoomId)

  if (redisAvailable && redis) {
    try {
      await redis.set(ALIAS_PREFIX + aliasRoomId, sourceRoomId, 'EX', 86400)
    } catch (err) {
      console.warn('[RoomStore] Redis setAlias failed:', err.message)
    }
  }
}

async function deleteAlias(aliasRoomId) {
  memoryAliases.delete(aliasRoomId)

  if (redisAvailable && redis) {
    try {
      await redis.del(ALIAS_PREFIX + aliasRoomId)
    } catch (err) {
      console.warn('[RoomStore] Redis deleteAlias failed:', err.message)
    }
  }
}

async function deleteAliasesBySourceRoom(sourceRoomId) {
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
  getAlias,
  setAlias,
  deleteAlias,
  deleteAliasesBySourceRoom,
}
