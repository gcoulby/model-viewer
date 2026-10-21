import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ViewOptionsContext } from '@/contexts/view-options-context'
import { DEFAULT_EDGE_DISPLAY } from '@/data/layoutOptions'
import { defaultViewOptions, type ToggleOptionKey } from '@/data/viewOptions'
import type { GraphNode } from '@/types/graph'
import type { EdgeDisplay, LayoutSettings, ViewOptions } from '@/types/view'

const HIDING_OPTION: Partial<Record<GraphNode['kind'], ToggleOptionKey>> = {
  enum: 'enums',
  datatype: 'dataTypes',
  external: 'external',
}

export function ViewOptionsProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ViewOptions>(defaultViewOptions)
  const [display, setDisplayState] = useState<EdgeDisplay>(DEFAULT_EDGE_DISPLAY)

  const setOption = useCallback((key: ToggleOptionKey, value: boolean) => {
    setOptions((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }))
  }, [])

  const setLayout = useCallback(<K extends keyof LayoutSettings>(key: K, value: LayoutSettings[K]) => {
    setOptions((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }))
  }, [])

  const setDisplay = useCallback(<K extends keyof EdgeDisplay>(key: K, value: EdgeDisplay[K]) => {
    setDisplayState((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }))
  }, [])

  const reveal = useCallback((kind: GraphNode['kind']) => {
    const key = HIDING_OPTION[kind]
    if (key) setOptions((prev) => (prev[key] ? prev : { ...prev, [key]: true }))
  }, [])

  const value = useMemo(
    () => ({ options, display, setOption, setLayout, setDisplay, reveal }),
    [options, display, setOption, setLayout, setDisplay, reveal],
  )
  return <ViewOptionsContext.Provider value={value}>{children}</ViewOptionsContext.Provider>
}
