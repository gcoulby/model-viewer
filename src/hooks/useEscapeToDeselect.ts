import { useEffect } from 'react'
import { usePasteDialog } from '@/hooks/usePasteDialog'
import { useSelection } from '@/hooks/useSelection'

/** Escape clears the selection, except while the paste dialog is open and uses the key itself. */
export function useEscapeToDeselect() {
  const { clear } = useSelection()
  const { open: pasteOpen } = usePasteDialog()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pasteOpen) clear()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [clear, pasteOpen])
}
