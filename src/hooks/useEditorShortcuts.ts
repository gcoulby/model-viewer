import { useEffect } from 'react'
import { useEditTarget } from '@/hooks/useEditTarget'
import { useEditorMode } from '@/hooks/useEditorMode'
import { useInstanceEdit } from '@/hooks/useInstanceEdit'
import { useModelEdit } from '@/hooks/useModelEdit'
import { useModels } from '@/hooks/useModels'
import { useSaveFiles } from '@/hooks/useSaveFiles'
import { typingInField } from '@/lib/keys'

/** Keys pressed on a button or in an open menu belong to it. */
const onControl = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.tagName === 'BUTTON' || !!target.closest('[role="menu"], [role="listbox"], [role="dialog"]'))

/**
 * E switches between view and edit. In edit mode, Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z (or Ctrl+Y) undo and redo,
 * and Cmd/Ctrl+S saves. In a text field, undo stays the field's own. With something targeted, Delete
 * removes it, Enter or F2 renames it, Alt+Up/Down moves it and Cmd/Ctrl+D duplicates it, wherever the
 * focus is, short of a field, button or menu.
 */
export function useEditorShortcuts() {
  const { mode, toggleMode, setMode } = useEditorMode()
  const { undo, redo } = useModels()
  const { save } = useSaveFiles()
  const { target, setTarget } = useEditTarget()
  const modelEdit = useModelEdit()
  const instanceEdit = useInstanceEdit()
  // The same keys edit whichever is being edited: the metamodel, or an instance of it.
  const edit = mode === 'instance' ? instanceEdit : modelEdit

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()
      if (!mod && !event.altKey && key === 'e' && !typingInField(event.target)) {
        event.preventDefault()
        toggleMode()
        return
      }
      if (!mod && !event.altKey && key === 'i' && !typingInField(event.target)) {
        event.preventDefault()
        setMode(mode === 'instance' ? 'view' : 'instance')
        return
      }
      if (mode === 'view') return
      if (target && !typingInField(event.target) && !onControl(event.target)) {
        const structural = target.path.length > 0
        if (!mod && !event.altKey && (event.key === 'Delete' || event.key === 'Backspace') && structural) {
          event.preventDefault()
          edit.remove(target)
          return
        }
        if (!mod && !event.altKey && (event.key === 'Enter' || event.key === 'F2')) {
          event.preventDefault()
          setTarget(target, { focusName: true })
          return
        }
        if (event.altKey && !mod && (event.key === 'ArrowUp' || event.key === 'ArrowDown') && structural) {
          event.preventDefault()
          edit.shift(target, event.key === 'ArrowUp' ? -1 : 1)
          return
        }
        if (mod && !event.altKey && key === 'd' && structural) {
          event.preventDefault()
          edit.duplicate(target)
          return
        }
      }
      if (!mod || event.altKey) return
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
  }, [mode, toggleMode, setMode, undo, redo, save, target, setTarget, edit])
}
