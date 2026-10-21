import { Button } from '@/components/ui/button'
import { useScope } from '@/hooks/useScope'
import type { GraphNode, ModelGraph, PackageBlockNode } from '@/types/graph'
import { ClassifierChips } from './ClassifierChips'
import { DetailSection } from './DetailSection'
import { PanelTitle } from './PanelTitle'

interface PackageDetailProps {
  graph: ModelGraph
  block: PackageBlockNode
  onClose: () => void
}

export function PackageDetail({ graph, block, onClose }: PackageDetailProps) {
  const { toggleFolded } = useScope()
  const members = block.memberIds.flatMap((id): GraphNode[] => {
    const node = graph.nodes.get(id)
    return node ? [node] : []
  })
  return (
    <div>
      <PanelTitle
        title={block.name}
        lines={['Collapsed package', block.package.nsURI, block.package.fileName]}
        onClose={onClose}
      />
      <Button size="sm" variant="outline" className="mt-3" onClick={() => toggleFolded([block.package.scopeId])}>
        Expand package
      </Button>
      <DetailSection title="Links">
        <p className="text-[12.5px] text-muted-foreground">
          {block.incoming} in from other boxes, {block.outgoing} out to them. Click a link on the diagram to list
          what it stands for.
        </p>
      </DetailSection>
      <DetailSection title="Types" count={members.length}>
        <ClassifierChips nodes={members} expand />
      </DetailSection>
    </div>
  )
}
