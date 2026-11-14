import { useContext } from 'react'
import { EditorModeContext } from '@/contexts/editor-mode-context'

export function useEditorMode() {
  const value = useContext(EditorModeContext)
  if (!value) throw new Error('useEditorMode must be used within an EditorModeProvider')
  return value
}
