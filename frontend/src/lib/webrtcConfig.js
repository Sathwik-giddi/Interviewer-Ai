/**
 * WebRTC Configuration - TURN/STUN Server Setup
 * 
 * This module handles ICE server configuration for WebRTC connections.
 * It fetches TURN credentials from the backend API (which securely
 * communicates with Metered.ca) rather than exposing API keys in the frontend.
 */

import { getBackendBaseUrl } from './runtimeConfig'
import { auth } from '../firebase'
import { getIdToken } from 'firebase/auth'

function splitCsv(value = '') {
  return String(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

const DEFAULT_STUN_URLS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
]

// Fallback TURN credentials (OpenRelay - free but rate-limited)
// Used only when backend is unavailable
const FALLBACK_TURN = {
  urls: [
    'turn:openrelay.metered.ca:80',
    'turn:openrelay.metered.ca:443',
    'turn:openrelay.metered.ca:443?transport=tcp',
  ],
  username: 'openrelayproject',
  credential: 'openrelayproject',
}

// In-memory cache for dynamically fetched TURN credentials
let dynamicTurnCache = {
  iceServers: null,
  expiresAt: 0,
  loading: false,
  error: null,
  lastFetchAttempt: 0,
}

// Cooldown period between failed fetch attempts (5 minutes)
const FETCH_COOLDOWN_MS = 5 * 60 * 1000

/**
 * Fetch TURN credentials from the backend API
 * The backend securely communicates with Metered.ca using the API key
 * @returns {Promise<Array>} Array of ICE server objects
 */
async function fetchTurnCredentialsFromBackend() {
  const backendUrl = getBackendBaseUrl()
  if (!backendUrl) {
    throw new Error('Backend URL not configured')
  }

  let authHeaders = { 'Content-Type': 'application/json' }
  try {
    if (auth.currentUser) {
      const token = await getIdToken(auth.currentUser)
      if (token) authHeaders['Authorization'] = `Bearer ${token}`
    }
  } catch {}

  const response = await fetch(`${backendUrl}/api/turn-credentials`, {
    method: 'GET',
    headers: authHeaders,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Failed to fetch TURN credentials: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.iceServers
}

/**
 * Get TURN credentials with caching and fallback
 * Tries backend first, falls back to OpenRelay if unavailable
 * @returns {Promise<Array>} Array of ICE server objects
 */
export async function getDynamicTurnCredentials() {
  const now = Date.now()

  // Return cached credentials if still valid
  if (
    dynamicTurnCache.iceServers &&
    dynamicTurnCache.expiresAt > now
  ) {
    return dynamicTurnCache.iceServers
  }

  // Prevent concurrent fetches
  if (dynamicTurnCache.loading) {
    // Wait for existing fetch to complete
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (!dynamicTurnCache.loading) {
          clearInterval(check)
          resolve(dynamicTurnCache.iceServers || getFallbackIceServers())
        }
      }, 100)
    })
  }

  // Check cooldown period after failed attempt
  if (
    dynamicTurnCache.error &&
    now - dynamicTurnCache.lastFetchAttempt < FETCH_COOLDOWN_MS
  ) {
    console.warn('[TURN] Using fallback credentials (backend fetch in cooldown)')
    return getFallbackIceServers()
  }

  // Fetch fresh credentials from backend
  dynamicTurnCache.loading = true
  dynamicTurnCache.lastFetchAttempt = now

  try {
    console.log('[TURN] Fetching credentials from backend...')
    const iceServers = await fetchTurnCredentialsFromBackend()

    // Cache with 23-hour TTL (credentials expire at 24 hours)
    dynamicTurnCache = {
      iceServers,
      expiresAt: now + (23 * 60 * 60 * 1000),
      loading: false,
      error: null,
      lastFetchAttempt: now,
    }

    console.log('[TURN] Successfully fetched and cached credentials from backend')
    return iceServers
  } catch (error) {
    console.error('[TURN] Failed to fetch from backend:', error.message)
    dynamicTurnCache = {
      iceServers: null,
      expiresAt: 0,
      loading: false,
      error: error.message,
      lastFetchAttempt: now,
    }

    // Fallback to OpenRelay
    console.warn('[TURN] Using fallback OpenRelay credentials')
    return getFallbackIceServers()
  }
}

/**
 * Get fallback ICE servers (OpenRelay - free but rate-limited)
 * Used when backend is unavailable
 * @returns {Array}
 */
export function getFallbackIceServers() {
  return [
    { urls: DEFAULT_STUN_URLS },
    {
      urls: FALLBACK_TURN.urls,
      username: FALLBACK_TURN.username,
      credential: FALLBACK_TURN.credential,
    },
  ]
}

/**
 * Get STUN URLs from environment or defaults
 * @returns {string[]}
 */
export function getStunUrls() {
  const configured = splitCsv(import.meta.env.VITE_STUN_URLS)
  return configured.length ? configured : DEFAULT_STUN_URLS
}

/**
 * Get TURN URLs from environment (legacy, deprecated)
 * @returns {string[]}
 */
export function getTurnUrls() {
  return splitCsv(import.meta.env.VITE_TURN_URLS)
}

/**
 * Check if static TURN config exists in environment variables (legacy)
 * @returns {boolean}
 */
export function hasStaticTurnConfig() {
  return Boolean(
    getTurnUrls().length &&
    (import.meta.env.VITE_TURN_USERNAME || '').trim() &&
    (import.meta.env.VITE_TURN_PASSWORD || '').trim()
  )
}

/**
 * Check if dynamic TURN credentials are available (from backend)
 * @returns {boolean}
 */
export function hasTurnConfig() {
  // Check if we have cached credentials or are loading them
  const hasCached = dynamicTurnCache.iceServers !== null
  const isLoading = dynamicTurnCache.loading
  // Also check static config for backward compatibility
  const hasStatic = hasStaticTurnConfig()
  return hasCached || isLoading || hasStatic
}

/**
 * Get ICE servers for WebRTC
 * Prioritizes dynamic credentials from backend, falls back to static config
 * @returns {Promise<Array>} Array of ICE server objects
 */
export async function getIceServersAsync() {
  // Try dynamic credentials first
  const dynamicServers = await getDynamicTurnCredentials()
  if (dynamicServers) {
    return dynamicServers
  }

  // Fallback to static config
  return getIceServers()
}

/**
 * Get ICE servers synchronously (uses cached or static config)
 * For async version with backend fetch, use getIceServersAsync()
 * @returns {Array}
 */
export function getIceServers() {
  const servers = [{ urls: getStunUrls() }]

  // Check for static TURN config (legacy)
  const turnUrls = getTurnUrls()
  const username = (import.meta.env.VITE_TURN_USERNAME || '').trim()
  const credential = (import.meta.env.VITE_TURN_PASSWORD || '').trim()

  if (turnUrls.length && username && credential) {
    servers.push({
      urls: turnUrls,
      username,
      credential,
    })
  } else {
    // Use fallback OpenRelay if no static config
    servers.push({
      urls: FALLBACK_TURN.urls,
      username: FALLBACK_TURN.username,
      credential: FALLBACK_TURN.credential,
    })
  }

  return servers
}

/**
 * Build RTC configuration for RTCPeerConnection
 * @param {Object} options
 * @param {boolean} options.forceRelay - Force TURN relay usage
 * @returns {Object} RTCConfiguration object
 */
export function buildRtcConfig({ forceRelay = false } = {}) {
  return {
    iceServers: getIceServers(),
    iceTransportPolicy: forceRelay ? 'relay' : 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: forceRelay ? 0 : 8,
  }
}

/**
 * Build RTC configuration asynchronously (fetches from backend)
 * @param {Object} options
 * @param {boolean} options.forceRelay - Force TURN relay usage
 * @returns {Promise<Object>} RTCConfiguration object
 */
export async function buildRtcConfigAsync({ forceRelay = false } = {}) {
  const iceServers = await getIceServersAsync()
  return {
    iceServers,
    iceTransportPolicy: forceRelay ? 'relay' : 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: forceRelay ? 0 : 8,
  }
}

/**
 * Check if a candidate string looks like a relay candidate
 * @param {string} candidate
 * @returns {boolean}
 */
export function looksLikeRelayCandidate(candidate = '') {
  return /\styp\srelay(\s|$)/i.test(String(candidate))
}

/**
 * Get selected candidate pair info for debugging
 * @param {RTCPeerConnection} pc
 * @returns {Promise<Object|null>}
 */
export async function getSelectedCandidatePairInfo(pc) {
  if (!pc?.getStats) return null

  try {
    const stats = await pc.getStats()
    let selectedPair = null
    const localCandidates = new Map()
    const remoteCandidates = new Map()

    stats.forEach(report => {
      if (report.type === 'local-candidate') localCandidates.set(report.id, report)
      if (report.type === 'remote-candidate') remoteCandidates.set(report.id, report)
      if (
        report.type === 'candidate-pair' &&
        (report.selected || report.nominated || report.state === 'succeeded')
      ) {
        selectedPair = report
      }
      if (report.type === 'transport' && report.selectedCandidatePairId && !selectedPair) {
        selectedPair = stats.get(report.selectedCandidatePairId) || selectedPair
      }
    })

    if (!selectedPair) return null

    const local = localCandidates.get(selectedPair.localCandidateId)
    const remote = remoteCandidates.get(selectedPair.remoteCandidateId)

    return {
      pairState: selectedPair.state || '',
      localCandidateType: local?.candidateType || '',
      remoteCandidateType: remote?.candidateType || '',
      protocol: local?.protocol || remote?.protocol || '',
      usesRelay: local?.candidateType === 'relay' || remote?.candidateType === 'relay',
    }
  } catch {
    return null
  }
}

/**
 * Force refresh TURN credentials from backend
 * Useful for admin actions or when credentials expire unexpectedly
 * @returns {Promise<void>}
 */
export async function refreshTurnCredentials() {
  const backendUrl = getBackendBaseUrl()
  if (!backendUrl) return

  try {
    const response = await fetch(`${backendUrl}/api/turn-credentials/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.ok) {
      // Clear local cache to force re-fetch
      dynamicTurnCache = {
        iceServers: null,
        expiresAt: 0,
        loading: false,
        error: null,
        lastFetchAttempt: 0,
      }
      console.log('[TURN] Credentials refreshed successfully')
    }
  } catch (error) {
    console.error('[TURN] Failed to refresh credentials:', error.message)
  }
}
