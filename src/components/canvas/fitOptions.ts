import type { FitViewOptions } from '@xyflow/react'
import type { DiagramNode } from './nodes/nodeTypes'

export const MIN_ZOOM = 0.04
export const MAX_ZOOM = 3
const MAX_FIT_ZOOM = 1.1
const FIT_PADDING_PX = 30

export const FIT_OPTIONS: FitViewOptions<DiagramNode> = {
  padding: `${FIT_PADDING_PX}px`,
  minZoom: MIN_ZOOM,
  maxZoom: MAX_FIT_ZOOM,
  duration: 0,
}
