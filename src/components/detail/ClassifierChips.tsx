import { Button } from '@/components/ui/button'
import { useSelectNode } from '@/hooks/useSelectNode'
import type { GraphNode } from '@/types/graph'

interface ClassifierChipsProps {
  nodes: GraphNode[]
  /** Opens a collapsed package to show the picked type, rather than selecting the package. */
  expand?: boolean
}

export function ClassifierChips({ nodes, expand = false }: ClassifierChipsProps) {
  const selectNode = useSelectNode()
  return (
    <div className="flex flex-wrap gap-[5px]">
      {nodes.map((node) => (
        <Button
          key={node.id}
          variant="outline"
          size="xs"
          className="bg-muted font-mono font-normal hover:border-primary hover:text-primary"
          onClick={() => selectNode(node.id, { center: true, expand })}
        >
          {node.name}
        </Button>
      ))}
    </div>
  )
}
