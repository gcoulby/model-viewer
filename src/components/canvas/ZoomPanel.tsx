import { HandIcon, MinusIcon, PlusIcon, SquareDashedMousePointerIcon } from 'lucide-react'
import { Panel, useReactFlow, useStore } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'
import { useDiagram } from '@/hooks/useDiagram'
import type { DiagramEdge } from './edges/edgeTypes'
import { FIT_OPTIONS } from './fitOptions'
import type { CanvasNode } from './nodes/nodeTypes'

const ZOOM_STEP = 1.25

export type CanvasTool = 'pan' | 'select'

interface ZoomPanelProps {
  tool: CanvasTool
  onToolChange: (tool: CanvasTool) => void
}

export function ZoomPanel({ tool, onToolChange }: ZoomPanelProps) {
  const { zoomTo, getZoom, fitView } = useReactFlow<CanvasNode, DiagramEdge>()
  const zoom = useStore((s) => s.transform[2])
  const { relayout, graph, layoutStale } = useDiagram()
  const isMobile = useIsMobile()

  return (
    <Panel
      position={isMobile ? 'top-right' : 'bottom-right'}
      className="flex items-center overflow-hidden rounded-lg border bg-card"
    >
      <Button
        variant={tool === 'pan' ? 'secondary' : 'ghost'}
        size="icon"
        aria-label="Pan tool"
        title="Drag to pan"
        aria-pressed={tool === 'pan'}
        onClick={() => onToolChange('pan')}
      >
        <HandIcon />
      </Button>
      <Button
        variant={tool === 'select' ? 'secondary' : 'ghost'}
        size="icon"
        aria-label="Select tool"
        title="Drag to box-select, then drag a selected node to move them all (Shift-drag does this in pan mode)"
        aria-pressed={tool === 'select'}
        onClick={() => onToolChange('select')}
      >
        <SquareDashedMousePointerIcon />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Zoom out" onClick={() => void zoomTo(getZoom() / ZOOM_STEP)}>
        <MinusIcon />
      </Button>
      <output className="min-w-[50px] text-center font-mono text-xs text-muted-foreground">
        {Math.round(zoom * 100)}%
      </output>
      <Button variant="ghost" size="icon" aria-label="Zoom in" onClick={() => void zoomTo(getZoom() * ZOOM_STEP)}>
        <PlusIcon />
      </Button>
      <Button variant="ghost" onClick={() => void fitView(FIT_OPTIONS)}>
        Fit
      </Button>
      <Button
        variant={layoutStale ? 'secondary' : 'ghost'}
        disabled={!graph}
        onClick={relayout}
        title={layoutStale ? 'Links were ported or unported; lay out again to separate the parts they join' : undefined}
      >
        Re-layout
        {layoutStale && <span aria-label="out of date" className="size-1.5 rounded-full bg-primary" />}
      </Button>
    </Panel>
  )
}
