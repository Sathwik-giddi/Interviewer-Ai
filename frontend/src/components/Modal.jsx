/**
 * Modal — Reusable modal component (Agentica 2.0 design system)
 *
 * Props:
 *   isOpen       — boolean, controls visibility
 *   onClose      — function, called when backdrop or close button clicked
 *   title        — string, optional header text
 *   children     — content
 *   size         — 'sm' | 'md' | 'lg' (default 'md')
 *   closable     — boolean, show close button (default true)
 *   variant      — 'default' | 'danger' (red accent for warnings)
 */
import React, { useEffect, useRef } from 'react'

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closable = true,
  variant = 'default',
}) {
  const contentRef = useRef(null)

  // Close on Escape key
  useEffect(() => {
    if (!isOpen || !closable) return
    function handleKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, closable, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  if (!isOpen) return null

  const widths = { sm: '400px', md: '600px', lg: '800px' }
  const maxW = widths[size] || widths.md
  const borderColor = variant === 'danger' ? 'var(--danger, #dc2626)' : 'var(--border, #e5e7eb)'
  const accentBorder = variant === 'danger' ? '3px solid var(--danger, #dc2626)' : 'none'

  return (
    <div style={S.overlay} onClick={closable ? onClose : undefined}>
      <div
        ref={contentRef}
        style={{ ...S.container, maxWidth: maxW, borderTop: accentBorder, borderColor }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {(title || closable) && (
          <div style={S.header}>
            {title && <h3 style={S.title}>{title}</h3>}
            {closable && (
              <button style={S.closeBtn} onClick={onClose} aria-label="Close modal">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div style={S.body}>
          {children}
        </div>
      </div>
    </div>
  )
}

const S = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
    animation: 'fadeIn 0.15s ease',
  },
  container: {
    background: '#fff',
    border: '1px solid var(--border, #e5e7eb)',
    borderRadius: '0px',
    width: '90%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'slideUp 0.2s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 0',
    gap: '16px',
  },
  title: {
    fontFamily: 'var(--font-head, "Bebas Neue", sans-serif)',
    fontSize: '22px',
    letterSpacing: '0.04em',
    margin: 0,
    color: 'var(--text, #1a1a2e)',
    flex: 1,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    color: 'var(--text-muted, #6b7280)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
    flexShrink: 0,
  },
  body: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
  },
}
