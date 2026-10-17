import type { NodeProps } from '@xyflow/react'
import { NodeFrame } from './NodeFrame'
import type { DiagramNode } from './nodeTypes'

export function DataTypeNode({ data, selected }: NodeProps<DiagramNode>) {
  return <NodeFrame data={data} selected={selected} />
}
