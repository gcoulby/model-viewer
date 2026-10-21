import type { NodeProps } from '@xyflow/react'
import { NodeFrame } from './NodeFrame'
import type { DiagramNode } from './nodeTypes'

/** A collapsed package, drawn as a small stack so it reads as many types in one box. */
export function PackageNode({ data, selected }: NodeProps<DiagramNode>) {
  return <NodeFrame data={data} selected={selected} stacked />
}
