import { useMemo, type MouseEvent } from 'react'
import { useDiagram } from '@/hooks/useDiagram'
import { useFileColors } from '@/hooks/useFileColors'
import { useSelectNode } from '@/hooks/useSelectNode'
import { useTheme } from '@/hooks/useTheme'
import { useViewOptions } from '@/hooks/useViewOptions'
import { buildDiagramSvg } from '@/lib/ecore/export'
import { readExportColors } from '@/lib/ecore/exportColors'
import { layoutByFile } from '@/lib/ecore/layoutGroups'
import { computeGeometry, createTextMeasurer } from '@/lib/ecore/measure'
import { computeParallel, neighbourhood } from '@/lib/ecore/visibleGraph'
import type { GraphNode } from '@/types/graph'
import type { NodeGeometry } from '@/types/view'
import { DetailSection } from './DetailSection'

/** The selected node with the nodes it is linked to, drawn small; clicking a neighbour selects it. */
export function NeighbourhoodDiagram({ node }: { node: GraphNode }) {
  const { visible } = useDiagram()
  const { options } = useViewOptions()
  const { theme } = useTheme()
  const { hueFor } = useFileColors()
  const selectNode = useSelectNode()
  const measure = useMemo(createTextMeasurer, [])

  const diagram = useMemo(() => {
    if (!visible || !visible.nodeIds.has(node.id)) return null
    const near = neighbourhood(visible.edges, node.id)
    if (near.nodeIds.size < 2) return null
    const nodes = visible.nodes.filter((n) => near.nodeIds.has(n.id))
    const edges = visible.edges.filter((e) => near.edgeIds.has(e.id))
    const geometry = new Map<string, NodeGeometry>(
      nodes.map((n) => [n.id, computeGeometry(n, options, true, measure)]),
    )
    const positions = layoutByFile(nodes, edges, geometry, options.direction, 'layered', 'compact')
    const parallel = computeParallel(edges)
    const svg = buildDiagramSvg({
      nodes: nodes.flatMap((n) => {
        const p = positions.get(n.id)
        const g = geometry.get(n.id)
        return p && g ? [{ node: n, geometry: g, x: p.x, y: p.y }] : []
      }),
      edges: edges.flatMap((edge) => {
        const info = parallel.get(edge.id)
        return info ? [{ edge, parallel: info }] : []
      }),
      dark: theme === 'dark',
      hueFor,
      colors: readExportColors(),
      focusId: node.id,
      nodeIds: true,
      fluid: true,
    })
    return svg ? { text: svg.text, count: near.nodeIds.size - 1 } : null
  }, [visible, node.id, options, measure, theme, hueFor])

  if (!diagram) return null

  const onClick = (event: MouseEvent) => {
    const id = (event.target as Element).closest('[data-node-id]')?.getAttribute('data-node-id')
    if (id && id !== node.id) selectNode(id)
  }

  return (
    <DetailSection title="Neighbourhood" count={diagram.count}>
      <div
        role="img"
        aria-label={`Diagram of ${node.name} and the types linked to it`}
        onClick={onClick}
        className="overflow-hidden rounded-md border bg-background p-1.5 [&>svg]:max-h-80"
        dangerouslySetInnerHTML={{ __html: diagram.text }}
      />
    </DetailSection>
  )
}
