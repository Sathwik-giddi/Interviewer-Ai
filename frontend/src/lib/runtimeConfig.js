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
