import { Button } from '@/components/ui/button'
import { useSelectNode } from '@/hooks/useSelectNode'
import type { GraphNode } from '@/types/graph'

export function ClassifierChips({ nodes }: { nodes: GraphNode[] }) {
  const selectNode = useSelectNode()
  return (
    <div className="flex flex-wrap gap-[5px]">
      {nodes.map((node) => (
        <Button
          key={node.id}
          variant="outline"
          size="xs"
          className="bg-muted font-mono font-normal hover:border-primary hover:text-primary"
          onClick={() => selectNode(node.id, { center: true })}
        >
          {node.name}
        </Button>
      ))}
    </div>
  )
}
