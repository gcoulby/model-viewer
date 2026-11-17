import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { EditorModeContext, type EditorMode } from '@/contexts/editor-mode-context'

const STORAGE_KEY = 'ecore-viewer:mode'

function storedMode(): EditorMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'edit' || stored === 'instance' || stored === 'analysis' ? stored : 'view'
  } catch {
    return 'view'
  }
}

export function EditorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<EditorMode>(storedMode)

  const setMode = useCallback((next: EditorMode) => {
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // The mode is only remembered as a convenience.
    }
  }, [])

  const toggleMode = useCallback(() => setMode(mode === 'edit' ? 'view' : 'edit'), [mode, setMode])
  const value = useMemo(() => ({ mode, setMode, toggleMode }), [mode, setMode, toggleMode])
  return <EditorModeContext.Provider value={value}>{children}</EditorModeContext.Provider>
}
