import { createContext } from 'react'
import type { DiagramEdge } from '@/components/canvas/edges/edgeTypes'
import type { DiagramNode } from '@/components/canvas/nodes/nodeTypes'
import type { ModelGraph } from '@/types/graph'
import type { VisibleGraph } from '@/lib/ecore/visibleGraph'

export interface DiagramContextValue {
  graph: ModelGraph | null
  visible: VisibleGraph | null
  /** Changes identity whenever the layout is recomputed. */
  layout: object | null
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  collapsedIds: ReadonlySet<string>
  toggleCollapsed: (id: string) => void
  relayout: () => void
}

export const DiagramContext = createContext<DiagramContextValue | null>(null)
