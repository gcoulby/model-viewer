import type { EdgeProps } from '@xyflow/react'
import { FloatingEdge } from './FloatingEdge'
import type { DiagramEdge } from './edgeTypes'

export function ReferenceEdge(props: EdgeProps<DiagramEdge>) {
  return <FloatingEdge {...props} />
}
