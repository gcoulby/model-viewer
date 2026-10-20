import { useState } from 'react'
import { Maximize2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNeighbourhood } from '@/hooks/useNeighbourhood'
import type { GraphNode } from '@/types/graph'
import { DetailSection } from './DetailSection'
import { NeighbourhoodDialog } from './NeighbourhoodDialog'
import { NeighbourhoodView } from './NeighbourhoodView'

/** The selected node with the nodes it is linked to, drawn small, with a button to pop it out. */
export function NeighbourhoodDiagram({ node }: { node: GraphNode }) {
  const { count, build } = useNeighbourhood(node)
  const [open, setOpen] = useState(false)
  if (!build) return null

  return (
    <DetailSection title="Neighbourhood" count={count}>
      <div className="relative">
        <NeighbourhoodView
          build={build}
          selectedId={node.id}
          label={`Diagram of ${node.name} and the types linked to it`}
          className="overflow-hidden [&>svg]:max-h-80"
        />
        <Button
          variant="outline"
          size="icon-xs"
          aria-label="Pop out neighbourhood diagram"
          title="Pop out"
          className="absolute top-1.5 right-1.5 bg-card"
          onClick={() => setOpen(true)}
        >
          <Maximize2Icon />
        </Button>
      </div>
      <NeighbourhoodDialog open={open} onOpenChange={setOpen} node={node} build={build} />
    </DetailSection>
  )
}
