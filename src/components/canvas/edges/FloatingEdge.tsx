import { BaseEdge, type EdgeProps } from '@xyflow/react'
import { useSelectNode } from '@/hooks/useSelectNode'
import { edgeLabels, edgeStyleFor, type EdgeTone } from '@/lib/ecore/edgeStyle'
import { cn } from '@/lib/utils'
import { MARKER_IDS } from './EdgeMarkers'
import type { DiagramEdge } from './edgeTypes'
import { PortTagView } from './PortTagView'

const TONE_CLASS: Record<EdgeTone, string> = {
  edge: 'stroke-edge!',
  muted: 'stroke-muted-foreground!',
  cycle: 'stroke-cycle!',
}

/** Draws any edge kind along the path the canvas routed for it, with its end labels or port tags. */
export function FloatingEdge({ data }: EdgeProps<DiagramEdge>) {
  const selectNode = useSelectNode()
  if (!data?.path) return null

  const { edge, title, path, portTexts } = data
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
        className={cn(TONE_CLASS[style.tone])}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.dash ?? undefined}
      />
      {path.ports && portTexts && (
        <>
          <PortTagView
            tag={path.ports.start}
            text={portTexts.start}
            outgoing
            title={`${title}. Click to go to the other end.`}
            onClick={() => selectNode(edge.to, { center: true })}
          />
          <PortTagView
            tag={path.ports.end}
            text={portTexts.end}
            outgoing={false}
            title={`${title}. Click to go to the other end.`}
            onClick={() => selectNode(edge.from, { center: true })}
          />
        </>
      )}
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
