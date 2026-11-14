import { createContext } from 'react'
import type { ParsedModel } from '@/types/ecore'
import type { WorkspaceFile } from '@/lib/workspace/workspace'

export interface ModelSource {
  /** Path relative to the opened folder, or just the file name. */
  name: string
  text: string
}

export interface AddResult {
  /** Number of sources that parsed and were added. */
  added: number
  errors: string[]
}

/** Gives an edit the XML documents it changes. Each is parsed on first use and written back afterwards. */
export interface EditTransaction {
  /** The document of an open file, or null when no file has that key. */
  doc: (key: string) => XMLDocument | null
}

export interface EditOptions {
  /** Edits with the same key made within a moment of each other undo as one step. */
  coalesce?: string
}

export interface ModelsContextValue {
  models: ParsedModel[]
  /** The open files, whose XML is the master copy of each model. */
  files: WorkspaceFile[]
  /** Keys of the files changed since they were loaded or saved. */
  dirtyKeys: ReadonlySet<string>
  /** Bumped by loading, closing and restoring files, but not by edits. */
  epoch: number
  /** Parses each source, replacing any loaded file with the same key. Failures do not discard the rest. */
  addSources: (sources: ModelSource[]) => AddResult
  /** Adds pasted XML under the next free `pasted-<n>.ecore` name. */
  addPasted: (text: string) => AddResult
  removeModel: (key: string) => void
  /** Manual links from an unresolved external's URI to the key of a loaded file. */
  links: ReadonlyMap<string, string>
  /** Points every reference to `uri` at the loaded file `modelKey`. */
  linkExternal: (uri: string, modelKey: string) => void
  /** Adds an empty model and returns its key. */
  createModel: () => string
  /**
   * Runs `change` against the documents it asks for and records the result as one undoable step.
   * Returns false when nothing changed.
   */
  edit: (label: string, change: (tx: EditTransaction) => void, options?: EditOptions) => boolean
  undo: () => void
  redo: () => void
  /** What the next undo or redo would reverse, or null when there is nothing to do. */
  undoLabel: string | null
  redoLabel: string | null
  /** Records the files as saved, clearing their unsaved mark. */
  markSaved: (keys: string[]) => void
}

export const ModelsContext = createContext<ModelsContextValue | null>(null)
