const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

function stripTrailingSlash(value = '') {
  return value.replace(/\/+$/, '')
}

function getBrowserOrigin() {
  return typeof window !== 'undefined' ? window.location.origin : ''
}

function getBrowserHostname() {
  return typeof window !== 'undefined' ? window.location.hostname : ''
}

function isLocalHost(hostname = '') {
  return LOCAL_HOSTS.has(hostname) || hostname.endsWith('.local')
}

function resolveConfiguredBaseUrl(rawValue) {
  const configured = stripTrailingSlash((rawValue || '').trim())
  const browserOrigin = getBrowserOrigin()

  if (!configured) return ''
  if (!browserOrigin) return configured

  try {
    const parsed = new URL(configured, browserOrigin)
    const publicBrowser = !isLocalHost(getBrowserHostname())
    const localTarget = isLocalHost(parsed.hostname)

    if (publicBrowser && localTarget) return ''

    const normalized = stripTrailingSlash(parsed.toString())
    return normalized === browserOrigin ? '' : normalized
  } catch {
    return configured
  }
}

export function getBackendBaseUrl() {
  return resolveConfiguredBaseUrl(import.meta.env.VITE_BACKEND_URL)
}

export function getSocketServerUrl() {
  return resolveConfiguredBaseUrl(import.meta.env.VITE_SIGNALING_URL) || undefined
}

export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getBackendBaseUrl()}${normalizedPath}`
}

export function getPublicAppOrigin() {
  return getBrowserOrigin() || stripTrailingSlash((import.meta.env.VITE_PUBLIC_APP_URL || '').trim())
}

export function normalizeRoutePath(path = '/') {
  if (!path) return '/'
  return path.startsWith('/') ? path : `/${path}`
}

export function appUrl(path = '/') {
  const normalizedPath = normalizeRoutePath(path)
  return `${getPublicAppOrigin()}/#${normalizedPath}`
}

export function interviewUrl(roomId) {
  return appUrl(`/interview/${roomId}`)
}

export function observerUrl(campaignId) {
  return appUrl(`/observe/${campaignId}`)
}

export function getCurrentRoutePath() {
  if (typeof window === 'undefined') return '/'
  const hash = window.location.hash || ''
  if (hash.startsWith('#/')) return hash.slice(1)
  return window.location.pathname || '/'
}

export function routePathFromAppUrl(rawUrl = '') {
  if (!rawUrl) return '/'

  const fallbackBase = getPublicAppOrigin() || 'http://localhost'

  try {
    const parsed = new URL(rawUrl, fallbackBase)
    if (parsed.hash.startsWith('#/')) {
      return `${parsed.hash.slice(1)}${parsed.search}`
    }

    return `${parsed.pathname}${parsed.search}`
  } catch {
    if (rawUrl.startsWith('#/')) return rawUrl.slice(1)
    if (rawUrl.startsWith('/')) return rawUrl
    return normalizeRoutePath(rawUrl)
  }
}
