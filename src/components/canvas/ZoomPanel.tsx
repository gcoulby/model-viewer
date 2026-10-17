import { MinusIcon, PlusIcon } from 'lucide-react'
import { Panel, useReactFlow, useStore } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'
import { useDiagram } from '@/hooks/useDiagram'
import type { DiagramEdge } from './edges/edgeTypes'
import { FIT_OPTIONS } from './fitOptions'
import type { DiagramNode } from './nodes/nodeTypes'

const ZOOM_STEP = 1.25

export function ZoomPanel() {
  const { zoomTo, getZoom, fitView } = useReactFlow<DiagramNode, DiagramEdge>()
  const zoom = useStore((s) => s.transform[2])
  const { relayout, graph } = useDiagram()
  const isMobile = useIsMobile()

  return (
    <Panel
      position={isMobile ? 'top-right' : 'bottom-right'}
      className="flex items-center overflow-hidden rounded-lg border bg-card"
    >
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
      <Button variant="ghost" disabled={!graph} onClick={relayout}>
        Re-layout
      </Button>
    </Panel>
  )
}
