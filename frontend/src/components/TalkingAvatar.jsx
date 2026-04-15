/**
 * TalkingAvatar — Animated AI interviewer avatar with audio sync
 * Shows sound waves when speaking, idle animation otherwise
 */
import React, { useEffect, useRef, useState } from 'react'

export default function TalkingAvatar({ isSpeaking = false, size = 120, label = 'AI' }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const [bars, setBars] = useState(Array(7).fill(0.3))

  // Animate sound wave bars when speaking
  useEffect(() => {
    if (!isSpeaking) {
      setBars(Array(7).fill(0.3))
      cancelAnimationFrame(animRef.current)
      return
    }

    let frame = 0
    function animate() {
      frame++
      setBars(prev => prev.map((_, i) => {
        const phase = (frame * 0.08) + (i * 0.7)
        return 0.3 + Math.sin(phase) * 0.35 + Math.cos(phase * 1.3) * 0.15
      }))
      animRef.current = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(animRef.current)
  }, [isSpeaking])

  // Draw avatar face on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    const cx = w / 2
    const cy = h / 2

    ctx.clearRect(0, 0, w, h)

    // Background circle
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.42)
    gradient.addColorStop(0, isSpeaking ? '#8b6cf6' : '#7353F6')
    gradient.addColorStop(1, isSpeaking ? '#6d4de0' : '#5a3dd6')
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.4, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()

    // Pulse ring when speaking
    if (isSpeaking) {
      ctx.beginPath()
      ctx.arc(cx, cy, w * 0.44, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(115, 83, 246, 0.3)'
      ctx.lineWidth = 3
      ctx.stroke()
    }

    // Eyes
    ctx.fillStyle = '#fff'
    const eyeY = cy - w * 0.06
    const eyeSpread = w * 0.1
    ctx.beginPath()
    ctx.arc(cx - eyeSpread, eyeY, w * 0.04, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx + eyeSpread, eyeY, w * 0.04, 0, Math.PI * 2)
    ctx.fill()

    // Mouth — open when speaking, smile when idle
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    const mouthY = cy + w * 0.1
    if (isSpeaking) {
      ctx.beginPath()
      ctx.ellipse(cx, mouthY, w * 0.08, w * 0.05, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.fill()
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(cx, mouthY - w * 0.02, w * 0.08, 0.15 * Math.PI, 0.85 * Math.PI)
      ctx.stroke()
    }
  }, [isSpeaking])

  const barWidth = Math.max(3, size * 0.025)
  const barGap = Math.max(2, size * 0.02)
  const totalBarsWidth = bars.length * barWidth + (bars.length - 1) * barGap

  return (
    <div style={S.wrapper}>
      <div style={{ ...S.container, width: size, height: size + 40 }}>
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          style={{ display: 'block' }}
        />

        {/* Sound wave bars */}
        <div style={{ ...S.barsContainer, height: 28 }}>
          {bars.map((h, i) => (
            <div
              key={i}
              style={{
                width: barWidth,
                height: `${Math.max(20, h * 100)}%`,
                background: isSpeaking ? 'var(--primary)' : 'var(--border)',
                borderRadius: barWidth,
                transition: isSpeaking ? 'none' : 'height 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* Status label */}
      <div style={S.label}>
        <span style={{
          ...S.dot,
          background: isSpeaking ? 'var(--primary)' : 'var(--text-muted)',
        }} className={isSpeaking ? 'pulse' : ''} />
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: isSpeaking ? 'var(--primary)' : 'var(--text-muted)',
        }}>
          {isSpeaking ? 'SPEAKING' : 'LISTENING'}
        </span>
      </div>
    </div>
  )
}

const S = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  barsContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    display: 'inline-block',
  },
}
