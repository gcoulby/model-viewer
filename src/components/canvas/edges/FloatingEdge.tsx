import { BaseEdge, useInternalNode, type EdgeProps, type InternalNode } from '@xyflow/react'
import { computeEdgePath, type Box } from '@/lib/ecore/edgeGeometry'
import { edgeLabels, edgeStyleFor } from '@/lib/ecore/edgeStyle'
import { cn } from '@/lib/utils'
import { MARKER_IDS } from './EdgeMarkers'
import type { DiagramEdge } from './edgeTypes'

function boxOf(node: InternalNode | undefined): Box | null {
  if (!node) return null
  const width = node.measured.width ?? node.width
  const height = node.measured.height ?? node.height
  if (!width || !height) return null
  const { x, y } = node.internals.positionAbsolute
  return { x, y, width, height }
}

/** Draws any edge kind, with each end at the point where the line between the node centres meets the outline. */
export function FloatingEdge({ source, target, data }: EdgeProps<DiagramEdge>) {
  const sourceBox = boxOf(useInternalNode(source))
  const targetBox = boxOf(useInternalNode(target))
  if (!data || !sourceBox || !targetBox) return null

  const { edge, parallel, title } = data
  const style = edgeStyleFor(edge)
  const path = computeEdgePath(sourceBox, targetBox, parallel, source === target)
  const labels = edgeLabels(edge, path)

  return (
    <g>
      <title>{title}</title>
      <BaseEdge
        path={path.d}
        interactionWidth={12}
        markerStart={style.markerStart ? `url(#${MARKER_IDS[style.markerStart]})` : undefined}
        markerEnd={style.markerEnd ? `url(#${MARKER_IDS[style.markerEnd]})` : undefined}
        className={cn(style.muted ? 'stroke-muted-foreground!' : 'stroke-edge!')}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.dash ?? undefined}
      />
      <g className="pointer-events-none font-sans">
        {labels.map((label, i) => (
          <text
            key={i}
            x={label.placement.x}
            y={label.placement.y}
            textAnchor={label.placement.anchor}
            fontSize={label.fontSize}
            dominantBaseline="central"
            className="fill-foreground stroke-halo stroke-4 [paint-order:stroke] [stroke-linejoin:round]"
          >
            {label.text}
          </text>
        ))}
      </g>
    </g>
  )
}
