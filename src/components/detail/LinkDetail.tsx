import { useDiagram } from '@/hooks/useDiagram'
import { usePorts } from '@/hooks/usePorts'
import { useSelectNode } from '@/hooks/useSelectNode'
import { useViewOptions } from '@/hooks/useViewOptions'
import { Button } from '@/components/ui/button'
import { dependencyCount, edgeTitle } from '@/lib/ecore/edgeStyle'
import { portPredicate } from '@/lib/ecore/ports'
import type { DrawnEdge, ModelGraph } from '@/types/graph'
import { DetailSection } from './DetailSection'
import { LinkList } from './LinkList'
import { PanelTitle } from './PanelTitle'
import { PortControls } from './PortControls'

interface LinkDetailProps {
  graph: ModelGraph
  edge: DrawnEdge
  onClose: () => void
}

/** A selected link: what it joins, the links behind it when it stands for several, and porting. */
export function LinkDetail({ graph, edge, onClose }: LinkDetailProps) {
  const { drawn, layout } = useDiagram()
  const { display, options } = useViewOptions()
  const { overrides } = usePorts()
  const selectNode = useSelectNode()
  const drawnNodes = new Map((drawn?.nodes ?? []).map((n) => [n.id, n]))
  const nameOf = (id: string) => graph.nodes.get(id)?.name ?? drawnNodes.get(id)?.name ?? '?'
  const from = nameOf(edge.from)
  const to = nameOf(edge.to)

  const boxes = layout?.laidOut.boxes
  const fromBox = boxes?.get(edge.from)
  const toBox = boxes?.get(edge.to)
  const ported =
    !!fromBox && !!toBox && portPredicate(drawnNodes, display.ports, options.grouping, overrides)(edge, fromBox, toBox)

  return (
    <div>
      <PanelTitle
        title={edge.kind === 'dependency' ? `${from} and ${to}` : edgeTitle(edge, nameOf)}
        lines={[edge.kind === 'dependency' ? `Dependency, ${dependencyCount(edge)} links` : 'Link']}
        onClose={onClose}
      />
      <div className="mt-3 flex flex-wrap gap-[5px]">
        {[edge.from, edge.to].map((id) => (
          <Button
            key={id}
            variant="outline"
            size="xs"
            className="bg-muted font-mono font-normal hover:border-primary hover:text-primary"
            onClick={() => selectNode(id, { center: true })}
          >
            Go to {nameOf(id)}
          </Button>
        ))}
      </div>
      <PortControls edgeId={edge.id} ported={ported} />
      {edge.kind === 'dependency' && (
        <>
          {edge.forward.length > 0 && (
            <DetailSection title={`${from} to ${to}`} count={edge.forward.length}>
              <LinkList links={edge.forward} nameOf={nameOf} />
            </DetailSection>
          )}
          {edge.back.length > 0 && (
            <DetailSection title={`${to} to ${from}`} count={edge.back.length}>
              <LinkList links={edge.back} nameOf={nameOf} />
            </DetailSection>
          )}
        </>
      )}
    </div>
  )
}
