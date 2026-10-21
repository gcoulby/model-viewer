import { createContext } from 'react'
import type { ToggleOptionKey } from '@/data/viewOptions'
import type { GraphNode } from '@/types/graph'
import type { EdgeDisplay, LayoutSettings, ViewOptions } from '@/types/view'

export interface ViewOptionsContextValue {
  options: ViewOptions
  /** How links are drawn; changing it never re-runs the layout. */
  display: EdgeDisplay
  setOption: (key: ToggleOptionKey, value: boolean) => void
  setLayout: <K extends keyof LayoutSettings>(key: K, value: LayoutSettings[K]) => void
  setDisplay: <K extends keyof EdgeDisplay>(key: K, value: EdgeDisplay[K]) => void
  /** Switches on the option that hides this kind of node, if it is off. */
  reveal: (kind: GraphNode['kind']) => void
}

export const ViewOptionsContext = createContext<ViewOptionsContextValue | null>(null)
