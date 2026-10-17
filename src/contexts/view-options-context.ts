import { createContext } from 'react'
import type { ToggleOptionKey } from '@/data/viewOptions'
import type { GraphNode } from '@/types/graph'
import type { LayoutDirection, ViewOptions } from '@/types/view'

export interface ViewOptionsContextValue {
  options: ViewOptions
  setOption: (key: ToggleOptionKey, value: boolean) => void
  setDirection: (direction: LayoutDirection) => void
  /** Switches on the option that hides this kind of node, if it is off. */
  reveal: (kind: GraphNode['kind']) => void
}

export const ViewOptionsContext = createContext<ViewOptionsContextValue | null>(null)
