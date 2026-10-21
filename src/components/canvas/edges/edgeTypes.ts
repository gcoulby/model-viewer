import type { Edge } from '@xyflow/react'
import type { EdgePath } from '@/lib/ecore/edgeGeometry'
import type { DrawnEdge, ParallelInfo } from '@/types/graph'
import { ContainmentEdge } from './ContainmentEdge'
import { DependencyEdgeView } from './DependencyEdge'
import { EnumLinkEdge } from './EnumLinkEdge'
import { InheritEdge } from './InheritEdge'
import { ReferenceEdge } from './ReferenceEdge'

export interface DiagramEdgeData extends Record<string, unknown> {
  edge: DrawnEdge
  parallel: ParallelInfo
  title: string
  /** Worked out by the canvas from the current box positions; nothing is drawn while it is null. */
  path: EdgePath | null
  labels: boolean
  /** Tag texts for a ported link: the far end at each end. */
  portTexts: { start: string; end: string } | null
}

export type DiagramEdgeType = 'inheritEdge' | 'containmentEdge' | 'referenceEdge' | 'enumLinkEdge' | 'dependencyEdge'

export type DiagramEdge = Edge<DiagramEdgeData, DiagramEdgeType>

export const edgeTypes = {
  inheritEdge: InheritEdge,
  containmentEdge: ContainmentEdge,
  referenceEdge: ReferenceEdge,
  enumLinkEdge: EnumLinkEdge,
  dependencyEdge: DependencyEdgeView,
}

export function edgeTypeFor(kind: DrawnEdge['kind']): DiagramEdgeType {
  switch (kind) {
    case 'inherit':
      return 'inheritEdge'
    case 'containment':
      return 'containmentEdge'
    case 'reference':
      return 'referenceEdge'
    case 'enumLink':
      return 'enumLinkEdge'
    case 'dependency':
      return 'dependencyEdge'
  }
}
