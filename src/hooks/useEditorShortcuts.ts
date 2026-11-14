import { useEffect } from 'react'
import { useEditorMode } from '@/hooks/useEditorMode'
import { useModels } from '@/hooks/useModels'
import { useSaveFiles } from '@/hooks/useSaveFiles'
import { typingInField } from '@/lib/keys'

/**
 * E switches between view and edit. In edit mode, Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z (or Ctrl+Y) undo and redo,
 * and Cmd/Ctrl+S saves. In a text field, undo stays the field's own.
 */
export function useEditorShortcuts() {
  const { mode, toggleMode } = useEditorMode()
  const { undo, redo } = useModels()
  const { save } = useSaveFiles()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()
      if (!mod && !event.altKey && key === 'e' && !typingInField(event.target)) {
        event.preventDefault()
        toggleMode()
        return
      }
      if (mode !== 'edit' || !mod || event.altKey) return
      if (key === 's') {
        event.preventDefault()
        void save()
        return
      }
      if (typingInField(event.target)) return
      if (key === 'z' || key === 'y') {
        event.preventDefault()
        if (key === 'y' || event.shiftKey) redo()
        else undo()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mode, toggleMode, undo, redo, save])
}
