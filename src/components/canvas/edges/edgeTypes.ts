import type { Edge } from '@xyflow/react'
import type { GraphEdge, ParallelInfo } from '@/types/graph'
import { ContainmentEdge } from './ContainmentEdge'
import { EnumLinkEdge } from './EnumLinkEdge'
import { InheritEdge } from './InheritEdge'
import { ReferenceEdge } from './ReferenceEdge'

export interface DiagramEdgeData extends Record<string, unknown> {
  edge: GraphEdge
  parallel: ParallelInfo
  title: string
}

export type DiagramEdgeType = 'inheritEdge' | 'containmentEdge' | 'referenceEdge' | 'enumLinkEdge'

export type DiagramEdge = Edge<DiagramEdgeData, DiagramEdgeType>

export const edgeTypes = {
  inheritEdge: InheritEdge,
  containmentEdge: ContainmentEdge,
  referenceEdge: ReferenceEdge,
  enumLinkEdge: EnumLinkEdge,
}

export function edgeTypeFor(kind: GraphEdge['kind']): DiagramEdgeType {
  switch (kind) {
    case 'inherit':
      return 'inheritEdge'
    case 'containment':
      return 'containmentEdge'
    case 'reference':
      return 'referenceEdge'
    case 'enumLink':
      return 'enumLinkEdge'
  }
}
