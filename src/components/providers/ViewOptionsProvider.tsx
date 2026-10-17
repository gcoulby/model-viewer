import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ViewOptionsContext } from '@/contexts/view-options-context'
import { VIEW_OPTIONS, type ToggleOptionKey } from '@/data/viewOptions'
import type { GraphNode } from '@/types/graph'
import type { LayoutDirection, ViewOptions } from '@/types/view'

const HIDING_OPTION: Partial<Record<GraphNode['kind'], ToggleOptionKey>> = {
  enum: 'enums',
  datatype: 'dataTypes',
  external: 'external',
}

function defaultOptions(): ViewOptions {
  const toggles = Object.fromEntries(VIEW_OPTIONS.map((o) => [o.key, o.defaultValue]))
  return { ...(toggles as Record<ToggleOptionKey, boolean>), direction: 'TB' }
}

export function ViewOptionsProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ViewOptions>(defaultOptions)

  const setOption = useCallback((key: ToggleOptionKey, value: boolean) => {
    setOptions((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }))
  }, [])

  const setDirection = useCallback((direction: LayoutDirection) => {
    setOptions((prev) => (prev.direction === direction ? prev : { ...prev, direction }))
  }, [])

  const reveal = useCallback((kind: GraphNode['kind']) => {
    const key = HIDING_OPTION[kind]
    if (key) setOptions((prev) => (prev[key] ? prev : { ...prev, [key]: true }))
  }, [])

  const value = useMemo(
    () => ({ options, setOption, setDirection, reveal }),
    [options, setOption, setDirection, reveal],
  )
  return <ViewOptionsContext.Provider value={value}>{children}</ViewOptionsContext.Provider>
}
