import React from 'react'

const LANGUAGES = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'te-IN', label: 'Telugu' },
]

const GENDERS = [
  { code: 'female', label: 'Female' },
  { code: 'male', label: 'Male' },
]

export default function VoiceSelector({ language, gender, onLanguageChange, onGenderChange }) {
  return (
    <div style={S.wrapper}>
      <div style={S.row}>
        <div style={S.field}>
          <label style={S.label}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
            Voice Language
          </label>
          <div style={S.btnGroup}>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                type="button"
                style={{ ...S.optionBtn, ...(language === l.code ? S.optionActive : {}) }}
                onClick={() => onLanguageChange(l.code)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div style={S.field}>
          <label style={S.label}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Voice Gender
          </label>
          <div style={S.btnGroup}>
            {GENDERS.map(g => (
              <button
                key={g.code}
                type="button"
                style={{ ...S.optionBtn, ...(gender === g.code ? S.optionActive : {}) }}
                onClick={() => onGenderChange(g.code)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const S = {
  wrapper: {
    padding: '12px 14px',
    background: 'var(--bg-subtle)',
    border: '1px solid var(--border)',
    marginBottom: '16px',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  field: {
    flex: 1,
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: '8px',
  },
  btnGroup: {
    display: 'flex',
    gap: '4px',
  },
  optionBtn: {
    flex: 1,
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 600,
    border: '1px solid var(--border)',
    background: '#fff',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.15s ease',
  },
  optionActive: {
    background: 'var(--primary)',
    color: '#fff',
    borderColor: 'var(--primary)',
  },
}
