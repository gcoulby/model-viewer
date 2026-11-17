import { createContext } from 'react'

/** View shows the model; edit changes the metamodel; instance makes and edits instances of it; analysis reports on it. */
export type EditorMode = 'view' | 'edit' | 'instance' | 'analysis'

export interface EditorModeContextValue {
  mode: EditorMode
  setMode: (mode: EditorMode) => void
  toggleMode: () => void
}

export const EditorModeContext = createContext<EditorModeContextValue | null>(null)
