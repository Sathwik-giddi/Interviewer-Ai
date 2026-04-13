/**
 * TURN Server Configuration Utility
 *
 * Uses Metered.ca for TURN relay servers to ensure cross-network WebRTC connectivity.
 * Strategy: Dynamic API (preferred) → Static fallback → Google STUN only
 */

const METERED_API_URL = 'https://open-interviewer.metered.live/api/v1/turn/credentials?apiKey=876e036a09795ff2cf68f0f06e70376c8ea8'

// Static TURN credentials (Metered.ca fallback — may expire, but work as backup)
const STATIC_ICE_SERVERS = [
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: 'turn:global.relay.metered.ca:80', username: '6695d7efa747633e5deeace9', credential: 'BSEyIggm5WJlQi4O' },
  { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: '6695d7efa747633e5deeace9', credential: 'BSEyIggm5WJlQi4O' },
  { urls: 'turn:global.relay.metered.ca:443', username: '6695d7efa747633e5deeace9', credential: 'BSEyIggm5WJlQi4O' },
  { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: '6695d7efa747633e5deeace9', credential: 'BSEyIggm5WJlQi4O' },
]

// Google STUN only (last resort — no TURN relay, same-network only)
const STUN_ONLY = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

// In-memory cache
let cachedIceServers = null
let cacheExpiresAt = 0
let fetchInProgress = null

const CACHE_TTL_MS = 23 * 60 * 60 * 1000 // 23 hours (credentials expire at 24h)

/**
 * Fetch ICE servers from Metered.ca dynamic API
 * @returns {Promise<Array>} Array of RTCIceServer objects
 */
export async function getTurnIceServers() {
  const now = Date.now()

  // Return cached if still valid
  if (cachedIceServers && cacheExpiresAt > now) {
    return cachedIceServers
  }

  // Deduplicate concurrent fetches
  if (fetchInProgress) {
    try {
      return await fetchInProgress
    } catch {
      // If the in-progress fetch fails, fall through to try again
    }
  }

  // Try dynamic Metered API
  fetchInProgress = (async () => {
    try {
      const response = await fetch(METERED_API_URL, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) throw new Error(`Metered API returned ${response.status}`)
      const iceServers = await response.json()
      if (!Array.isArray(iceServers) || iceServers.length === 0) {
        throw new Error('Metered API returned empty or invalid response')
      }
      cachedIceServers = iceServers
      cacheExpiresAt = now + CACHE_TTL_MS
      console.log('[TURN] Dynamic credentials fetched successfully:', iceServers.length, 'servers')
      return iceServers
    } catch (err) {
      console.warn('[TURN] Dynamic API failed, using static credentials:', err.message)
      cachedIceServers = STATIC_ICE_SERVERS
      cacheExpiresAt = now + CACHE_TTL_MS
      return STATIC_ICE_SERVERS
    } finally {
      fetchInProgress = null
    }
  })()

  try {
    return await fetchInProgress
  } catch {
    console.warn('[TURN] All methods failed, using STUN only')
    return STUN_ONLY
  }
}

/**
 * Build a complete RTCConfiguration object for RTCPeerConnection
 * @param {Object} options
 * @param {boolean} options.forceRelay - Force TURN relay (iceTransportPolicy: 'relay')
 * @returns {Promise<RTCConfiguration>}
 */
export async function buildRtcConfig({ forceRelay = false } = {}) {
  const iceServers = await getTurnIceServers()
  return {
    iceServers,
    iceTransportPolicy: forceRelay ? 'relay' : 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: forceRelay ? 0 : 8,
  }
}