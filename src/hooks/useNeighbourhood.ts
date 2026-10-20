import { useCallback, useMemo } from 'react'
import { useDiagram } from '@/hooks/useDiagram'
import { useFileColors } from '@/hooks/useFileColors'
import { useTheme } from '@/hooks/useTheme'
import { useViewOptions } from '@/hooks/useViewOptions'
import { buildDiagramSvg, type DiagramSvg } from '@/lib/ecore/export'
import { readExportColors } from '@/lib/ecore/exportColors'
import { layoutByFile } from '@/lib/ecore/layoutGroups'
import { computeGeometry, createTextMeasurer } from '@/lib/ecore/measure'
import { computeParallel, neighbourhood } from '@/lib/ecore/visibleGraph'
import type { GraphNode } from '@/types/graph'
import type { NodeGeometry } from '@/types/view'

export interface NeighbourhoodRender {
  /** Fluid SVGs fill their container; fixed ones have pixel sizes. `clickable` tags nodes with their ids. */
  fluid: boolean
  clickable: boolean
}

/** The selected node with the nodes it is linked to, as an SVG builder. Null `build` when it has no links. */
export function useNeighbourhood(node: GraphNode) {
  const { visible } = useDiagram()
  const { options } = useViewOptions()
  const { theme } = useTheme()
  const { hueFor } = useFileColors()
  const measure = useMemo(createTextMeasurer, [])

  const layout = useMemo(() => {
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
    return {
      count: near.nodeIds.size - 1,
      nodes: nodes.flatMap((n) => {
        const p = positions.get(n.id)
        const g = geometry.get(n.id)
        return p && g ? [{ node: n, geometry: g, x: p.x, y: p.y }] : []
      }),
      edges: edges.flatMap((edge) => {
        const info = parallel.get(edge.id)
        return info ? [{ edge, parallel: info }] : []
      }),
    }
  }, [visible, node.id, options, measure])

  const build = useCallback(
    ({ fluid, clickable }: NeighbourhoodRender): DiagramSvg | null =>
      layout &&
      buildDiagramSvg({
        nodes: layout.nodes,
        edges: layout.edges,
        dark: theme === 'dark',
        hueFor,
        colors: readExportColors(),
        focusId: node.id,
        nodeIds: clickable,
        fluid,
      }),
    [layout, theme, hueFor, node.id],
  )

  return { count: layout?.count ?? 0, build: layout ? build : null }
}
