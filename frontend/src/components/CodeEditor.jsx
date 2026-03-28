import React, { useRef, useState } from 'react'
import Editor from '@monaco-editor/react'

const LANGUAGES = ['javascript', 'python', 'java', 'cpp', 'typescript', 'go']

export default function CodeEditor({ value, onChange, language = 'javascript', onLanguageChange }) {
  const editorRef = useRef(null)
  const [syntaxErrors, setSyntaxErrors] = useState([])

  function handleMount(editor, monaco) {
    editorRef.current = editor
    // Listen for marker changes (syntax errors)
    monaco.editor.onDidChangeMarkers(() => {
      const model = editor.getModel()
      if (!model) return
      const markers = monaco.editor.getModelMarkers({ resource: model.uri })
      setSyntaxErrors(markers.filter(m => m.severity === monaco.MarkerSeverity.Error))
    })
  }

  function checkSyntax() {
    if (!editorRef.current) return
    // Trigger re-render of markers by forcing revalidation
    editorRef.current.trigger('keyboard', 'editor.action.formatDocument', {})
    setTimeout(() => {
      const model = editorRef.current?.getModel()
      if (!model) return
      // markers are already updated via onDidChangeMarkers
    }, 300)
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.toolbar}>
        <select
          value={language}
          onChange={e => onLanguageChange && onLanguageChange(e.target.value)}
          style={styles.select}
        >
          {LANGUAGES.map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <button className="btn btn-ghost" onClick={checkSyntax} style={{ padding: '6px 14px', fontSize: '12px' }}>
          Check Syntax
        </button>
      </div>

      <Editor
        height="320px"
        language={language}
        value={value}
        onChange={onChange}
        onMount={handleMount}
        theme="vs-light"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 2,
          automaticLayout: true,
        }}
      />

      {syntaxErrors.length > 0 && (
        <div style={styles.errorPanel}>
          <strong style={{ fontSize: '12px', color: 'var(--danger)' }}>
            {syntaxErrors.length} syntax error(s):
          </strong>
          {syntaxErrors.map((err, i) => (
            <div key={i} style={styles.errorRow}>
              Line {err.startLineNumber}: {err.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  wrapper: {
    border: '1px solid var(--border)',
    background: 'var(--bg)',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-subtle)',
  },
  select: {
    padding: '5px 10px',
    fontSize: '12px',
    fontFamily: 'var(--font-body)',
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
    cursor: 'pointer',
  },
  errorPanel: {
    padding: '10px 14px',
    borderTop: '1px solid var(--border)',
    background: '#fff5f5',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  errorRow: {
    fontSize: '12px',
    color: 'var(--danger)',
    fontFamily: 'monospace',
  },
}
