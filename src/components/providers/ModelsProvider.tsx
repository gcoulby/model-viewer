import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ModelsContext,
  type AddResult,
  type ModelSource,
} from '@/contexts/models-context'
import { parseModel } from '@/lib/ecore/parse'
import type { ParsedModel } from '@/types/ecore'

export function ModelsProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<ParsedModel[]>([])
  const nextIndex = useRef(0)

  const addSources = useCallback((sources: ModelSource[]): AddResult => {
    const parsed: ParsedModel[] = []
    const errors: string[] = []
    for (const source of sources) {
      try {
        parsed.push(parseModel(source.text, source.name, nextIndex.current))
        nextIndex.current += 1
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error))
      }
    }
    if (parsed.length) {
      const keys = new Set(parsed.map((m) => m.key))
      setModels((prev) => [...prev.filter((m) => !keys.has(m.key)), ...parsed])
    }
    return { added: parsed.length, errors }
  }, [])

  const addPasted = useCallback(
    (text: string) => addSources([{ name: `pasted-${nextIndex.current}.ecore`, text }]),
    [addSources],
  )

  const removeModel = useCallback((key: string) => {
    setModels((prev) => prev.filter((m) => m.key !== key))
  }, [])

  const value = useMemo(
    () => ({ models, addSources, addPasted, removeModel }),
    [models, addSources, addPasted, removeModel],
  )
  return <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>
}
