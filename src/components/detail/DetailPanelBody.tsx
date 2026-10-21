import { useDiagram } from '@/hooks/useDiagram'
import type { ModelGraph } from '@/types/graph'
import { DetailContent } from './DetailContent'
import { LinkDetail } from './LinkDetail'
import { PackageDetail } from './PackageDetail'

interface DetailPanelBodyProps {
  graph: ModelGraph
  selectedId: string
  onClose: () => void
}

/** Whichever view fits the selection: a type, a collapsed package or a link. */
export function DetailPanelBody({ graph, selectedId, onClose }: DetailPanelBodyProps) {
  const { drawn } = useDiagram()
  const node = graph.nodes.get(selectedId)
  if (node) return <DetailContent graph={graph} node={node} onClose={onClose} />
  const shown = drawn?.nodes.find((n) => n.id === selectedId)
  if (shown?.kind === 'package') return <PackageDetail graph={graph} block={shown} onClose={onClose} />
  const edge = drawn?.edges.find((e) => e.id === selectedId)
  if (edge) return <LinkDetail graph={graph} edge={edge} onClose={onClose} />
  return null
}
