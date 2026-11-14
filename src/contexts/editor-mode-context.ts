import { createContext } from 'react'

/** View shows the model; edit turns the tree and side panel towards changing it. */
export type EditorMode = 'view' | 'edit'

export interface EditorModeContextValue {
  mode: EditorMode
  setMode: (mode: EditorMode) => void
  toggleMode: () => void
}

export const EditorModeContext = createContext<EditorModeContextValue | null>(null)
