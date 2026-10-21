import { BaseEdge, type EdgeProps } from '@xyflow/react'
import { edgeLabels, edgeStyleFor } from '@/lib/ecore/edgeStyle'
import { cn } from '@/lib/utils'
import { MARKER_IDS } from './EdgeMarkers'
import type { DiagramEdge } from './edgeTypes'

/** Draws any edge kind along the path the canvas routed for it, with its end labels. */
export function FloatingEdge({ data }: EdgeProps<DiagramEdge>) {
  if (!data?.path) return null

  const { edge, title, path } = data
  const style = edgeStyleFor(edge)
  const labels = data.labels ? edgeLabels(edge, path) : []

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
