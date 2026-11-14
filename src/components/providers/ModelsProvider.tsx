import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ModelsContext,
  type AddResult,
  type EditOptions,
  type EditTransaction,
  type ModelSource,
} from '@/contexts/models-context'
import { parseModel } from '@/lib/ecore/parse'
import { newModelText } from '@/lib/workspace/newModel'
import { loadWorkspace, saveWorkspace, type StoredWorkspace } from '@/lib/workspace/store'
import {
  EMPTY_WORKSPACE,
  freeName,
  isDirty,
  workspaceReducer,
  type WorkspaceAction,
  type WorkspaceFile,
  type WorkspaceState,
} from '@/lib/workspace/workspace'
import { parseXml, serializeXml } from '@/lib/workspace/xml'
import type { ParsedModel } from '@/types/ecore'

const PERSIST_DELAY_MS = 400

// File objects are immutable and an edit only replaces the files it changes, so each file is parsed once
// and the others keep their parsed models.
const parsed = new WeakMap<WorkspaceFile, ParsedModel | null>()

function modelOf(file: WorkspaceFile): ParsedModel | null {
  if (!parsed.has(file)) {
    let model: ParsedModel | null = null
    try {
      model = parseModel(file.text, file.name, file.index)
    } catch {
      // Edits only write well-formed Ecore, and loading checks first, so this is not expected.
    }
    parsed.set(file, model)
  }
  return parsed.get(file) ?? null
}

export function ModelsProvider({ children }: { children: ReactNode }) {
  // Edits read the state they change, so the latest is kept in a ref as well as in React state; two edits
  // in the same event then build on each other rather than on the last render.
  const stateRef = useRef<WorkspaceState>(EMPTY_WORKSPACE)
  const [state, setState] = useState<WorkspaceState>(EMPTY_WORKSPACE)
  const [links, setLinks] = useState<ReadonlyMap<string, string>>(new Map())
  const [hydrated, setHydrated] = useState(false)

  const dispatch = useCallback((action: WorkspaceAction) => {
    const next = workspaceReducer(stateRef.current, action)
    if (next === stateRef.current) return false
    stateRef.current = next
    setState(next)
    return true
  }, [])

  const models = useMemo(() => state.files.flatMap((f) => modelOf(f) ?? []), [state.files])

  const dirtyKeys = useMemo(() => new Set(state.files.filter(isDirty).map((f) => f.key)), [state.files])

  const addSources = useCallback(
    (sources: ModelSource[]): AddResult => {
      const valid: ModelSource[] = []
      const errors: string[] = []
      for (const source of sources) {
        try {
          parseModel(source.text, source.name, -1)
          valid.push(source)
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error))
        }
      }
      dispatch({ type: 'add', files: valid })
      return { added: valid.length, errors }
    },
    [dispatch],
  )

  const addPasted = useCallback(
    (text: string) => addSources([{ name: freeName(stateRef.current.files, 'pasted'), text }]),
    [addSources],
  )

  const removeModel = useCallback((key: string) => void dispatch({ type: 'remove', key }), [dispatch])

  const linkExternal = useCallback((uri: string, modelKey: string) => {
    setLinks((prev) => new Map(prev).set(uri, modelKey))
  }, [])

  const createModel = useCallback(() => {
    const name = freeName(stateRef.current.files, 'untitled')
    dispatch({ type: 'add', files: [{ name, text: newModelText(name.replace(/\.ecore$/, '')), savedText: null }] })
    return name.toLowerCase()
  }, [dispatch])

  const edit = useCallback(
    (label: string, change: (tx: EditTransaction) => void, options?: EditOptions) => {
      const files = new Map(stateRef.current.files.map((f) => [f.key, f]))
      const docs = new Map<string, XMLDocument>()
      const tx: EditTransaction = {
        doc: (key) => {
          const open = docs.get(key)
          if (open) return open
          const file = files.get(key)
          if (!file) return null
          const doc = parseXml(file.text)
          docs.set(key, doc)
          return doc
        },
      }
      change(tx)
      const changes = [...docs].flatMap(([key, doc]) => {
        const file = files.get(key)
        return file ? [{ key, after: serializeXml(doc, file.text) }] : []
      })
      return dispatch({ type: 'edit', label, changes, coalesce: options?.coalesce ?? null, time: Date.now() })
    },
    [dispatch],
  )

  const undo = useCallback(() => void dispatch({ type: 'undo' }), [dispatch])
  const redo = useCallback(() => void dispatch({ type: 'redo' }), [dispatch])
  const markSaved = useCallback((keys: string[]) => void dispatch({ type: 'markSaved', keys }), [dispatch])

  // The last session's files come back on load. Anything opened while they were being read wins a clash.
  useEffect(() => {
    let active = true
    void loadWorkspace().then((stored) => {
      if (!active) return
      if (stored?.files.length) {
        const opened = new Set(stateRef.current.files.map((f) => f.key))
        dispatch({ type: 'add', files: stored.files.filter((f) => !opened.has(f.name.toLowerCase())) })
        setLinks((prev) => new Map([...stored.links, ...prev]))
      }
      setHydrated(true)
    })
    return () => {
      active = false
    }
  }, [dispatch])

  const snapshot = useCallback(
    (files: WorkspaceFile[], currentLinks: ReadonlyMap<string, string>): StoredWorkspace => ({
      files: files.map((f) => ({ name: f.name, text: f.text, savedText: f.savedText })),
      links: [...currentLinks],
    }),
    [],
  )

  useEffect(() => {
    if (!hydrated) return
    const timer = setTimeout(() => void saveWorkspace(snapshot(state.files, links)), PERSIST_DELAY_MS)
    const flush = () => void saveWorkspace(snapshot(state.files, links))
    window.addEventListener('pagehide', flush)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pagehide', flush)
    }
  }, [hydrated, state.files, links, snapshot])

  const undoLabel = state.undo[state.undo.length - 1]?.label ?? null
  const redoLabel = state.redo[state.redo.length - 1]?.label ?? null

  const value = useMemo(
    () => ({
      models,
      files: state.files,
      dirtyKeys,
      epoch: state.epoch,
      addSources,
      addPasted,
      removeModel,
      links,
      linkExternal,
      createModel,
      edit,
      undo,
      redo,
      undoLabel,
      redoLabel,
      markSaved,
    }),
    [
      models,
      state.files,
      dirtyKeys,
      state.epoch,
      addSources,
      addPasted,
      removeModel,
      links,
      linkExternal,
      createModel,
      edit,
      undo,
      redo,
      undoLabel,
      redoLabel,
      markSaved,
    ],
  )
  return <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>
}
