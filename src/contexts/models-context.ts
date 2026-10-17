import { createContext } from 'react'
import type { ParsedModel } from '@/types/ecore'

export interface ModelSource {
  name: string
  text: string
}

export interface AddResult {
  /** Number of sources that parsed and were added. */
  added: number
  errors: string[]
}

export interface ModelsContextValue {
  models: ParsedModel[]
  /** Parses each source, replacing any loaded file with the same key. Failures do not discard the rest. */
  addSources: (sources: ModelSource[]) => AddResult
  /** Adds pasted XML under the next free `pasted-<n>.ecore` name. */
  addPasted: (text: string) => AddResult
  removeModel: (key: string) => void
}

export const ModelsContext = createContext<ModelsContextValue | null>(null)
