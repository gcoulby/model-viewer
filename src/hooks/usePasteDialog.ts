import { useContext } from 'react'
import { PasteDialogContext } from '@/contexts/paste-dialog-context'

export function usePasteDialog() {
  const value = useContext(PasteDialogContext)
  if (!value) throw new Error('usePasteDialog must be used within a PasteDialogProvider')
  return value
}
