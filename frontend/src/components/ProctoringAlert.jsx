import React, { useEffect, useState, useRef, useCallback } from 'react'

const MAX_VIOLATIONS = 5

export default function ProctoringAlert({
  sessionId,
  backendUrl,
  isActive,
  onDisqualified,
  socketRef,
  roomId,
}) {
  const [modal, setModal] = useState(null)
  const [violationCount, setViolationCount] = useState(0)
  const [disqualified, setDisqualified] = useState(false)
  const beepCtxRef = useRef(null)
  const cooldownRef = useRef(false)

  const playBeep = useCallback((freq = 800, duration = 0.3, count = 2) => {
    try {
      if (!beepCtxRef.current) beepCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      const ctx = beepCtxRef.current
      for (let i = 0; i < count; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'square'
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * (duration + 0.15))
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * (duration + 0.15) + duration)
        osc.start(ctx.currentTime + i * (duration + 0.15))
        osc.stop(ctx.currentTime + i * (duration + 0.15) + duration)
      }
    } catch { /* audio not available */ }
  }, [])

  const logViolation = useCallback((type, details) => {
    if (!sessionId || !backendUrl) return
    fetch(`${backendUrl}/api/interview/violation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        type,
        timestamp: new Date().toISOString(),
        details,
      }),
    }).catch(() => {})
  }, [sessionId, backendUrl])

  const triggerAlert = useCallback((type, title, message, severity = 'warning') => {
    if (cooldownRef.current || disqualified) return
    cooldownRef.current = true
    setTimeout(() => { cooldownRef.current = false }, 3000)

    setViolationCount(prev => {
      const newCount = prev + 1

      logViolation(type, message)
      socketRef?.current?.emit('proctoring-alert', { roomId, warning: `${type}: ${message}` })

      if (newCount >= MAX_VIOLATIONS) {
        setDisqualified(true)
        playBeep(1200, 0.4, 4)
        setModal({
          title: 'Interview Terminated',
          message: `You have exceeded the maximum number of violations (${MAX_VIOLATIONS}). This interview has been ended.`,
          severity: 'disqualified',
          dismissable: false,
        })
        onDisqualified?.()
        return newCount
      }

      const remaining = MAX_VIOLATIONS - newCount
      playBeep(severity === 'danger' ? 1000 : 800, 0.25, severity === 'danger' ? 3 : 2)
      setModal({
        title,
        message: `${message}\n\nYou have ${remaining} warning${remaining !== 1 ? 's' : ''} remaining before disqualification.`,
        severity,
        dismissable: true,
        countdown: 5,
      })

      return newCount
    })
  }, [disqualified, logViolation, onDisqualified, playBeep, roomId, socketRef])

  // Tab switch detection
  useEffect(() => {
    if (!isActive) return

    function handleVisibilityChange() {
      if (document.hidden) {
        triggerAlert('tabSwitch', 'Tab Switch Detected', 'You switched away from the interview tab. Please stay focused.', 'warning')
      }
    }

    function handleWindowBlur() {
      if (!document.hidden) {
        triggerAlert('windowBlur', 'Window Focus Lost', 'You clicked outside the interview window.', 'warning')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [isActive, triggerAlert])

  // Expose trigger for parent (face detection calls this)
  useEffect(() => {
    window.__proctoringTrigger = triggerAlert
    return () => { delete window.__proctoringTrigger }
  }, [triggerAlert])

  // Modal countdown
  useEffect(() => {
    if (!modal?.countdown || !modal.dismissable) return
    const interval = setInterval(() => {
      setModal(prev => {
        if (!prev || prev.countdown <= 1) return null
        return { ...prev, countdown: prev.countdown - 1 }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [modal?.countdown, modal?.dismissable])

  if (!modal) return null

  const colors = {
    warning: { bg: '#fefce8', border: '#eab308', icon: '#92400e', btnBg: '#eab308' },
    danger: { bg: '#fef2f2', border: '#dc2626', icon: '#dc2626', btnBg: '#dc2626' },
    disqualified: { bg: '#fef2f2', border: '#7f1d1d', icon: '#7f1d1d', btnBg: '#7f1d1d' },
  }
  const c = colors[modal.severity] || colors.warning

  return (
    <div style={S.overlay}>
      <div style={{ ...S.box, borderTopColor: c.border }}>
        <div style={{ ...S.iconCircle, background: c.bg }}>
          {modal.severity === 'disqualified' ? (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          ) : modal.severity === 'danger' ? (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          ) : (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          )}
        </div>
        <h3 style={{ ...S.title, color: c.icon }}>{modal.title}</h3>
        <p style={S.msg}>{modal.message}</p>
        <div style={S.counter}>
          <span style={{ fontWeight: 700, color: c.icon }}>Violations: {violationCount}/{MAX_VIOLATIONS}</span>
          <div style={S.counterBar}>
            <div style={{ ...S.counterFill, width: `${(violationCount / MAX_VIOLATIONS) * 100}%`, background: c.border }} />
          </div>
        </div>
        {modal.dismissable && (
          <button style={{ ...S.btn, background: c.btnBg }} onClick={() => setModal(null)}>
            I Understand {modal.countdown ? `(${modal.countdown}s)` : ''}
          </button>
        )}
      </div>
    </div>
  )
}

const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px', animation: 'fadeIn 0.2s ease' },
  box: { background: '#fff', borderRadius: '0px', padding: '36px 32px', maxWidth: '600px', width: '90%', textAlign: 'center', borderTop: '4px solid', border: '1px solid var(--border, #e5e7eb)', animation: 'slideUp 0.3s ease' },
  iconCircle: { width: '72px', height: '72px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
  title: { fontFamily: 'var(--font-head)', fontSize: '24px', marginBottom: '10px', letterSpacing: '0.04em' },
  msg: { fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '20px', whiteSpace: 'pre-line' },
  counter: { marginBottom: '20px', padding: '10px 16px', background: '#f9fafb', border: '1px solid var(--border, #e5e7eb)' },
  counterBar: { height: '6px', background: '#e5e7eb', marginTop: '8px', overflow: 'hidden' },
  counterFill: { height: '100%', transition: 'width 0.4s ease' },
  btn: { color: '#fff', border: 'none', padding: '12px 32px', fontSize: '14px', fontWeight: 700, borderRadius: '0px', cursor: 'pointer', fontFamily: 'var(--font-body)', letterSpacing: '0.02em' },
}
