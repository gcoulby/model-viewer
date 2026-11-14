import { normalisePath } from '@/lib/ecore/paths'

/** One open file. Its XML text is the master copy; the parsed model is derived from it. */
export interface WorkspaceFile {
  /** Lower-cased `name`. Two files with the same key are the same file. */
  key: string
  /** Path relative to the opened folder, `/`-separated. */
  name: string
  /** Stays the same for the file's life, so the ids of its types survive edits. */
  index: number
  text: string
  /** The text as last loaded or saved, or null for a file that was never saved. */
  savedText: string | null
}

export interface FileChange {
  key: string
  before: string
  after: string
}

export interface HistoryEntry {
  label: string
  changes: FileChange[]
  /** Edits with the same key made close together merge into one step, so typing a name undoes in one go. */
  coalesce: string | null
  time: number
}

export interface WorkspaceState {
  files: WorkspaceFile[]
  nextIndex: number
  undo: HistoryEntry[]
  redo: HistoryEntry[]
  /** Bumped by every change that is not an edit (loading, closing, restoring), so the diagram lays out afresh. */
  epoch: number
}

export interface IncomingFile {
  name: string
  text: string
  /** Omitted means the text is what is on disk. */
  savedText?: string | null
}

export type WorkspaceAction =
  | { type: 'add'; files: IncomingFile[] }
  | { type: 'remove'; key: string }
  | { type: 'edit'; label: string; changes: { key: string; after: string }[]; coalesce: string | null; time: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'markSaved'; keys: string[] }

export const COALESCE_MS = 1500

export const EMPTY_WORKSPACE: WorkspaceState = { files: [], nextIndex: 0, undo: [], redo: [], epoch: 0 }

export const fileKeyOf = (name: string) => (normalisePath(name) || name).toLowerCase()

export const isDirty = (file: WorkspaceFile) => file.savedText !== file.text

const byKey = (a: WorkspaceFile, b: WorkspaceFile) => a.key.localeCompare(b.key)

/** Drops every history step's changes to the given files; steps left with nothing are dropped too. */
function forget(entries: HistoryEntry[], keys: ReadonlySet<string>): HistoryEntry[] {
  return entries.flatMap((entry) => {
    const changes = entry.changes.filter((c) => !keys.has(c.key))
    if (changes.length === entry.changes.length) return [entry]
    return changes.length ? [{ ...entry, changes }] : []
  })
}

function applyTexts(files: WorkspaceFile[], texts: ReadonlyMap<string, string>): WorkspaceFile[] {
  return files.map((f) => {
    const text = texts.get(f.key)
    return text === undefined || text === f.text ? f : { ...f, text }
  })
}

function sameKeys(a: FileChange[], b: { key: string }[]): boolean {
  return a.length === b.length && a.every((c) => b.some((d) => d.key === c.key))
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'add': {
      if (!action.files.length) return state
      const existing = new Map(state.files.map((f) => [f.key, f]))
      let nextIndex = state.nextIndex
      const added = new Map<string, WorkspaceFile>()
      for (const incoming of action.files) {
        const name = normalisePath(incoming.name) || incoming.name
        const key = name.toLowerCase()
        // A reloaded file keeps its index, so what was hidden or coloured stays that way.
        const index = existing.get(key)?.index ?? added.get(key)?.index ?? nextIndex++
        const savedText = incoming.savedText === undefined ? incoming.text : incoming.savedText
        added.set(key, { key, name, index, text: incoming.text, savedText })
      }
      const keys = new Set(added.keys())
      return {
        files: [...state.files.filter((f) => !keys.has(f.key)), ...added.values()].sort(byKey),
        nextIndex,
        undo: forget(state.undo, keys),
        redo: forget(state.redo, keys),
        epoch: state.epoch + 1,
      }
    }
    case 'remove': {
      if (!state.files.some((f) => f.key === action.key)) return state
      const keys = new Set([action.key])
      return {
        ...state,
        files: state.files.filter((f) => f.key !== action.key),
        undo: forget(state.undo, keys),
        redo: forget(state.redo, keys),
        epoch: state.epoch + 1,
      }
    }
    case 'edit': {
      const current = new Map(state.files.map((f) => [f.key, f.text]))
      const changes: FileChange[] = action.changes.flatMap((c) => {
        const before = current.get(c.key)
        return before === undefined || before === c.after ? [] : [{ key: c.key, before, after: c.after }]
      })
      if (!changes.length) return state
      const files = applyTexts(state.files, new Map(changes.map((c) => [c.key, c.after])))
      const last = state.undo[state.undo.length - 1]
      const merge =
        !!last &&
        action.coalesce !== null &&
        last.coalesce === action.coalesce &&
        action.time - last.time < COALESCE_MS &&
        sameKeys(last.changes, changes)
      if (merge) {
        const merged = last.changes
          .map((c) => ({ ...c, after: changes.find((d) => d.key === c.key)?.after ?? c.after }))
          .filter((c) => c.before !== c.after)
        const undo = state.undo.slice(0, -1)
        if (merged.length) undo.push({ ...last, changes: merged, time: action.time })
        return { ...state, files, undo, redo: [] }
      }
      const entry: HistoryEntry = { label: action.label, changes, coalesce: action.coalesce, time: action.time }
      return { ...state, files, undo: [...state.undo, entry], redo: [] }
    }
    case 'undo':
    case 'redo': {
      const from = action.type === 'undo' ? state.undo : state.redo
      const entry = from[from.length - 1]
      if (!entry) return state
      const texts = new Map(entry.changes.map((c) => [c.key, action.type === 'undo' ? c.before : c.after]))
      // A step can never merge with one made after it is undone or redone.
      const moved = { ...entry, coalesce: null }
      const files = applyTexts(state.files, texts)
      return action.type === 'undo'
        ? { ...state, files, undo: state.undo.slice(0, -1), redo: [...state.redo, moved] }
        : { ...state, files, redo: state.redo.slice(0, -1), undo: [...state.undo, moved] }
    }
    case 'markSaved': {
      const keys = new Set(action.keys)
      return {
        ...state,
        files: state.files.map((f) => (keys.has(f.key) && f.savedText !== f.text ? { ...f, savedText: f.text } : f)),
      }
    }
  }
}

/** The first of `base.ecore`, `base-2.ecore`, … that no open file uses. */
export function freeName(files: WorkspaceFile[], base: string, extension = '.ecore'): string {
  const taken = new Set(files.map((f) => f.key))
  for (let n = 1; ; n++) {
    const name = n === 1 ? `${base}${extension}` : `${base}-${n}${extension}`
    if (!taken.has(name.toLowerCase())) return name
  }
}
