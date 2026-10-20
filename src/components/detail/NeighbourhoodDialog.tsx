import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { NeighbourhoodRender } from '@/hooks/useNeighbourhood'
import { saveDiagram, type ExportFormat } from '@/lib/ecore/saveDiagram'
import type { DiagramSvg } from '@/lib/ecore/export'
import type { GraphNode } from '@/types/graph'
import { NeighbourhoodView } from './NeighbourhoodView'

interface NeighbourhoodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  node: GraphNode
  build: (render: NeighbourhoodRender) => DiagramSvg | null
}

/** A large view of the neighbourhood, with its own SVG and PNG export. */
export function NeighbourhoodDialog({ open, onOpenChange, node, build }: NeighbourhoodDialogProps) {
  const exportAs = (format: ExportFormat) => {
    const svg = build({ fluid: false, clickable: false })
    if (svg) void saveDiagram(svg, format, `${node.name}-neighbourhood`)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[min(1100px,92vw)]">
        <DialogHeader>
          <DialogTitle>{node.name}: neighbourhood</DialogTitle>
          <DialogDescription>Click a type to select it. The diagram updates to show its links.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto">
          <NeighbourhoodView
            build={build}
            selectedId={node.id}
            label={`Diagram of ${node.name} and the types linked to it`}
            className="min-w-[480px]"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => exportAs('svg')}>
            Export SVG
          </Button>
          <Button variant="outline" onClick={() => exportAs('png')}>
            Export PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
