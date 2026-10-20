import type { Node } from '@xyflow/react'
import type { GraphNode } from '@/types/graph'
import type { NodeGeometry } from '@/types/view'
import { ClassNode } from './ClassNode'
import { DataTypeNode } from './DataTypeNode'
import { EnumNode } from './EnumNode'
import { ExternalNode } from './ExternalNode'
import { FileGroupNodeView, type FileGroupNode } from './FileGroupNode'

export interface DiagramNodeData extends Record<string, unknown> {
  node: GraphNode
  geometry: NodeGeometry
}

export type DiagramNodeType = 'classNode' | 'enumNode' | 'dataTypeNode' | 'externalNode'

export type DiagramNode = Node<DiagramNodeData, DiagramNodeType>

/** Everything the canvas draws: the type nodes plus the per-file boxes behind them. */
export type CanvasNode = DiagramNode | FileGroupNode

export const nodeTypes = {
  fileGroup: FileGroupNodeView,
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
