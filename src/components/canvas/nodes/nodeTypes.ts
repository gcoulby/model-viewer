import type { Node } from '@xyflow/react'
import type { DrawnNode } from '@/types/graph'
import type { NodeGeometry } from '@/types/view'
import { ClassNode } from './ClassNode'
import { DataTypeNode } from './DataTypeNode'
import { EnumNode } from './EnumNode'
import { ExternalNode } from './ExternalNode'
import { FileGroupNodeView, type FileGroupNode } from './FileGroupNode'
import { PackageNode } from './PackageNode'

export interface DiagramNodeData extends Record<string, unknown> {
  node: DrawnNode
  geometry: NodeGeometry
}

export type DiagramNodeType = 'classNode' | 'enumNode' | 'dataTypeNode' | 'externalNode' | 'packageNode'

export type DiagramNode = Node<DiagramNodeData, DiagramNodeType>

/** Everything the canvas draws: the type nodes plus the per-file boxes behind them. */
export type CanvasNode = DiagramNode | FileGroupNode

export const nodeTypes = {
  fileGroup: FileGroupNodeView,
  classNode: ClassNode,
  enumNode: EnumNode,
  dataTypeNode: DataTypeNode,
  externalNode: ExternalNode,
  packageNode: PackageNode,
}

export function nodeTypeFor(kind: DrawnNode['kind']): DiagramNodeType {
  switch (kind) {
    case 'class':
      return 'classNode'
    case 'enum':
      return 'enumNode'
    case 'datatype':
      return 'dataTypeNode'
    case 'external':
      return 'externalNode'
    case 'package':
      return 'packageNode'
  }
}
