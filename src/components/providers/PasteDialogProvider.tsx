import { useMemo, useState, type ReactNode } from 'react'
import { PasteDialogContext } from '@/contexts/paste-dialog-context'

export function PasteDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const value = useMemo(() => ({ open, setOpen }), [open])
  return <PasteDialogContext.Provider value={value}>{children}</PasteDialogContext.Provider>
}
