import { createContext } from 'react'
import type { DiagramEdge } from '@/components/canvas/edges/edgeTypes'
import type { DiagramNode } from '@/components/canvas/nodes/nodeTypes'
import type { LaidOutRoutes } from '@/lib/ecore/routing'
import type { ModelGraph } from '@/types/graph'
import type { VisibleGraph } from '@/lib/ecore/visibleGraph'
import type { DrawnGraph } from '@/lib/ecore/fold'
import type { NodeGeometry } from '@/types/view'
import type { Position } from '@/lib/ecore/layout'

export interface DiagramLayout {
  positions: Map<string, Position>
  geometry: Map<string, NodeGeometry>
  laidOut: LaidOutRoutes
}

export interface DiagramContextValue {
  graph: ModelGraph | null
  /** The model's visible types and links, before packages are collapsed. */
  visible: VisibleGraph | null
  /** What is drawn: `visible` with collapsed packages folded into one box each. */
  drawn: DrawnGraph | null
  /** Changes identity whenever the layout is recomputed. */
  layout: DiagramLayout | null
  /** True while a new layout is being worked out; the previous one stays on screen meanwhile. */
  layoutPending: boolean
  /** True when links were ported or unported by hand since the layout ran; a re-layout separates them. */
  layoutStale: boolean
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  /** The edges that placed the boxes; the rest are drawn over the result. */
  shapingEdgeIds: ReadonlySet<string>
  collapsedIds: ReadonlySet<string>
  toggleCollapsed: (id: string) => void
  relayout: () => void
}

export const DiagramContext = createContext<DiagramContextValue | null>(null)
