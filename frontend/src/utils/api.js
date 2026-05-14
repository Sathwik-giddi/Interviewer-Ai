/**
 * API utility with payload size validation and truncation.
 * Prevents 413 Payload Too Large errors by checking payload size
 * before sending and truncating large fields (logs, error stacks, etc.).
 */

// ─── Configuration ──────────────────────────────────────────────────────────
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024 // 5 MB — leaves headroom for typical 8-10 MB server limits
const MAX_LOG_CHARS = 50000
const MAX_ERROR_STACK_CHARS = 10000
const MAX_ANSWER_CHARS = 4000
const MAX_DESCRIPTION_CHARS = 2000

async function getAuthHeader() {
  try {
    const { auth } = await import('../firebase.js')
    const user = auth.currentUser
    if (!user) return {}
    const token = await user.getIdToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

/**
 * Truncate a string to `maxLen` characters, appending a truncation notice.
 */
function truncateString(value, maxLen) {
  if (!value || typeof value !== 'string') return value
  if (value.length <= maxLen) return value
  return value.slice(0, maxLen) + '\n... [truncated]'
}

/**
 * Recursively truncate known large fields in a payload object.
 * Handles common fields: logs, errorStack, stack, message, answer, answers, description.
 */
export function truncatePayload(payload) {
  if (!payload || typeof payload !== 'object') return payload

  const truncated = Array.isArray(payload) ? [...payload] : { ...payload }

  // Known large-text field truncation rules
  const fieldLimits = {
    logs: MAX_LOG_CHARS,
    errorStack: MAX_ERROR_STACK_CHARS,
    stack: MAX_ERROR_STACK_CHARS,
    message: MAX_ERROR_STACK_CHARS,
    error: MAX_ERROR_STACK_CHARS,
    description: MAX_DESCRIPTION_CHARS,
    jobDescription: MAX_DESCRIPTION_CHARS,
    job_description: MAX_DESCRIPTION_CHARS,
  }

  for (const [field, limit] of Object.entries(fieldLimits)) {
    if (truncated[field] && typeof truncated[field] === 'string') {
      truncated[field] = truncateString(truncated[field], limit)
    }
  }

  // Truncate long answer arrays
  if (Array.isArray(truncated.answers)) {
    truncated.answers = truncated.answers.map((a) => {
      if (!a || typeof a !== 'object') return a
      return {
        ...a,
        answer: typeof a.answer === 'string' ? truncateString(a.answer, MAX_ANSWER_CHARS) : a.answer,
        question: typeof a.question === 'string' ? truncateString(a.question, MAX_DESCRIPTION_CHARS) : a.question,
      }
    })
  }

  // Truncate long question arrays
  if (Array.isArray(truncated.questions)) {
    truncated.questions = truncated.questions.map((q) => {
      if (!q || typeof q !== 'object') return q
      return {
        ...q,
        text: typeof q.text === 'string' ? truncateString(q.text, MAX_DESCRIPTION_CHARS) : q.text,
        modelAnswer: typeof q.modelAnswer === 'string' ? truncateString(q.modelAnswer, MAX_ANSWER_CHARS) : q.modelAnswer,
      }
    })
  }

  // Truncate violations array if excessive
  if (Array.isArray(truncated.violations) && truncated.violations.length > 100) {
    truncated.violations = truncated.violations.slice(0, 100)
    truncated.violationsTruncated = true
  }

  return truncated
}

/**
 * Measure the byte size of a JSON-serializable value (approximate, using UTF-16).
 * Returns the byte length of the JSON string.
 */
export function measurePayloadSize(payload) {
  try {
    return new Blob([JSON.stringify(payload)]).size
  } catch {
    return JSON.stringify(payload).length * 2 // rough UTF-16 estimate
  }
}

/**
 * Validate and prepare a payload for sending. Checks size, truncates if needed.
 * Returns { payload, wasTruncated, originalSize, finalSize } or throws if too large.
 */
export function validatePayload(payload) {
  const originalSize = measurePayloadSize(payload)

  if (originalSize <= MAX_PAYLOAD_SIZE) {
    return { payload, wasTruncated: false, originalSize, finalSize: originalSize }
  }

  // Attempt truncation
  let truncated = truncatePayload(payload)
  let finalSize = measurePayloadSize(truncated)

  // If still too large after first pass, do aggressive truncation
  if (finalSize > MAX_PAYLOAD_SIZE) {
    // Strip large text fields entirely
    const aggressive = { ...truncated }
    for (const field of ['logs', 'errorStack', 'stack', 'violations']) {
      if (aggressive[field]) {
        aggressive[field] = `[${field} removed — payload too large]`
      }
    }
    // Limit answers to first 5 only
    if (Array.isArray(aggressive.answers) && aggressive.answers.length > 5) {
      aggressive.answers = aggressive.answers.slice(0, 5)
      aggressive.answersTruncated = true
    }
    truncated = aggressive
    finalSize = measurePayloadSize(truncated)
  }

  if (finalSize > MAX_PAYLOAD_SIZE) {
    throw new Error(
      `Payload too large even after truncation (${(finalSize / 1024 / 1024).toFixed(1)} MB). ` +
      'Please reduce the input data (e.g., trim logs, shorten error reports, or split into multiple requests).'
    )
  }

  console.warn(
    `[API] Payload truncated: ${(originalSize / 1024 / 1024).toFixed(2)} MB → ${(finalSize / 1024 / 1024).toFixed(2)} MB`
  )

  return { payload: truncated, wasTruncated: true, originalSize, finalSize }
}

/**
 * Safe fetch wrapper that validates and truncates payload size before sending.
 * Drop-in replacement for `fetch()` for JSON POST/PUT/PATCH requests.
 *
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @param {object} [payloadOptions] - Additional options
 * @param {boolean} [payloadOptions.skipValidation=false] - Skip payload size validation
 * @returns {Promise<Response>} - The fetch Response
 */
export async function safeFetch(url, options = {}, { skipValidation = false } = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const authHeader = await getAuthHeader()
  const baseHeaders = options.headers instanceof Headers
    ? Object.fromEntries(options.headers.entries())
    : { ...(options.headers || {}) }
  const optionsWithAuth = {
    ...options,
    headers: { ...baseHeaders, ...authHeader },
  }

  // Only validate payloads for methods that send a body
  if (!skipValidation && optionsWithAuth.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    if (
      typeof FormData !== 'undefined' && optionsWithAuth.body instanceof FormData ||
      typeof Blob !== 'undefined' && optionsWithAuth.body instanceof Blob ||
      typeof URLSearchParams !== 'undefined' && optionsWithAuth.body instanceof URLSearchParams
    ) {
      return fetch(url, optionsWithAuth)
    }

    let parsedBody = optionsWithAuth.body

    // Parse JSON string body for validation
    if (typeof optionsWithAuth.body === 'string') {
      try {
        parsedBody = JSON.parse(optionsWithAuth.body)
      } catch {
        // Not JSON — skip validation for FormData or other types
        return fetch(url, optionsWithAuth)
      }
    }

    const { payload: validatedPayload, wasTruncated } = validatePayload(parsedBody)

    const newOptions = {
      ...optionsWithAuth,
      body: JSON.stringify(validatedPayload),
    }

    // Ensure content-type is set for JSON
    if (!newOptions.headers) {
      newOptions.headers = { 'Content-Type': 'application/json' }
    } else if (newOptions.headers instanceof Headers) {
      if (!newOptions.headers.has('Content-Type')) {
        newOptions.headers.set('Content-Type', 'application/json')
      }
    } else if (typeof newOptions.headers === 'object' && !newOptions.headers['Content-Type']) {
      newOptions.headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(url, newOptions)

    // Add a flag to the response so callers know truncation happened
    if (wasTruncated) {
      response._payloadTruncated = true
    }

    return response
  }

  return fetch(url, optionsWithAuth)
}

export async function authFetch(url, options = {}) {
  return safeFetch(url, options, { skipValidation: true })
}

/**
 * Send a bug report with automatic payload truncation.
 *
 * @param {object} report - Bug report data
 * @param {string} report.logs - Application/debug logs
 * @param {string} report.errorStack - Error stack trace
 * @param {string} report.userAction - Description of what the user was doing
 * @param {string} [report.sessionId] - Optional session ID
 * @returns {Promise<object>} - The server response
 */
export async function sendBugReport(report) {
  const { payload } = validatePayload(report)

  // Use apiUrl helper for consistent URL resolution (matches backend proxy)
  let url = '/api/bug-report'
  try {
    const { getSocketServerUrl } = await import('../lib/runtimeConfig.js')
    const signalUrl = getSocketServerUrl()
    url = `${signalUrl || ''}/api/bug-report`
  } catch {
    // Fallback to relative path if runtimeConfig unavailable
  }

  const response = await safeFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    if (response.status === 413) {
      throw new Error(
        'Bug report is too large even after truncation. Please shorten the logs or error details and try again.'
      )
    }
    throw new Error(`Bug report submission failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export { MAX_PAYLOAD_SIZE, MAX_LOG_CHARS, MAX_ERROR_STACK_CHARS }
