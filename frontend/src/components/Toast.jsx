/**
 * Lightweight toast notification system.
 *
 * Usage:
 *   import { useToast, ToastContainer } from '../components/Toast'
 *
 *   function MyComponent() {
 *     const toast = useToast()
 *     toast.success('Saved!')
 *     toast.error('Something went wrong')
 *     toast.info('Generating questions…')
 *   }
 *
 *   // Place <ToastContainer /> once, near the root (App.jsx or Layout).
 */
import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (msg, dur) => push(msg, 'success', dur),
    error:   (msg, dur) => push(msg, 'error',   dur ?? 5000),
    info:    (msg, dur) => push(msg, 'info',     dur),
    warning: (msg, dur) => push(msg, 'warning',  dur),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null
  return (
    <div style={styles.container}>
      {toasts.map(t => (
        <div key={t.id} style={{ ...styles.toast, ...typeStyles[t.type] }} className="slide-in-right">
          <span style={{ flex: 1, fontSize: '14px' }}>{t.message}</span>
          <button onClick={() => onRemove(t.id)} style={styles.close}>✕</button>
        </div>
      ))}
    </div>
  )
}

const styles = {
  container: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: 9999,
    maxWidth: '360px',
    width: '100%',
    pointerEvents: 'none',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    border: '1px solid',
    background: '#fff',
    boxShadow: 'none',
    pointerEvents: 'all',
  },
  close: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'inherit',
    opacity: 0.6,
    flexShrink: 0,
    padding: '0 4px',
  },
}

const typeStyles = {
  info:    { borderColor: 'var(--primary)',  color: 'var(--primary)',  background: 'var(--primary-light)' },
  success: { borderColor: 'var(--success)',  color: 'var(--success)',  background: '#f0fff4' },
  error:   { borderColor: 'var(--danger)',   color: 'var(--danger)',   background: '#fff5f5' },
  warning: { borderColor: 'var(--warning)',  color: 'var(--warning)',  background: '#fffbeb' },
}
