import { createContext } from 'react'

export interface PasteDialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

export const PasteDialogContext = createContext<PasteDialogContextValue | null>(null)
