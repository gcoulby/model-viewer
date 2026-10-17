import type { Node } from '@xyflow/react'
import type { GraphNode } from '@/types/graph'
import type { NodeGeometry } from '@/types/view'
import { ClassNode } from './ClassNode'
import { DataTypeNode } from './DataTypeNode'
import { EnumNode } from './EnumNode'
import { ExternalNode } from './ExternalNode'

export interface DiagramNodeData extends Record<string, unknown> {
  node: GraphNode
  geometry: NodeGeometry
}

export type DiagramNodeType = 'classNode' | 'enumNode' | 'dataTypeNode' | 'externalNode'

export type DiagramNode = Node<DiagramNodeData, DiagramNodeType>

export const nodeTypes = {
  classNode: ClassNode,
  enumNode: EnumNode,
  dataTypeNode: DataTypeNode,
  externalNode: ExternalNode,
}

export function nodeTypeFor(kind: GraphNode['kind']): DiagramNodeType {
  switch (kind) {
    case 'class':
      return 'classNode'
    case 'enum':
      return 'enumNode'
    case 'datatype':
      return 'dataTypeNode'
    case 'external':
      return 'externalNode'
  }
}
