import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { edgeTypeFor, type DiagramEdge } from '@/components/canvas/edges/edgeTypes'
import { nodeTypeFor, type DiagramNode } from '@/components/canvas/nodes/nodeTypes'
import { DiagramContext } from '@/contexts/diagram-context'
import { useModels } from '@/hooks/useModels'
import { useScope } from '@/hooks/useScope'
import { useViewOptions } from '@/hooks/useViewOptions'
import { buildGraph } from '@/lib/ecore/buildGraph'
import { edgeTitle } from '@/lib/ecore/edgeStyle'
import { layoutByFile } from '@/lib/ecore/layoutGroups'
import type { Position } from '@/lib/ecore/layout'
import { computeGeometry, createTextMeasurer, waitForFonts } from '@/lib/ecore/measure'
import { computeParallel, computeVisible } from '@/lib/ecore/visibleGraph'
import type { NodeGeometry } from '@/types/view'

interface Layout {
  positions: Map<string, Position>
  geometry: Map<string, NodeGeometry>
}

interface CollapsedState {
  layout: Layout | null
  ids: Set<string>
}

const NO_COLLAPSED: ReadonlySet<string> = new Set()

function useFontsReady(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let active = true
    void waitForFonts().then(() => {
      if (active) setReady(true)
    })
    return () => {
      active = false
    }
  }, [])
  return ready
}

export function DiagramProvider({ children }: { children: ReactNode }) {
  const { models, links } = useModels()
  const { options } = useViewOptions()
  const { focus, hidden } = useScope()
  const fontsReady = useFontsReady()
  const measure = useMemo(createTextMeasurer, [])
  const [relayoutCount, setRelayoutCount] = useState(0)
  const [collapsedState, setCollapsedState] = useState<CollapsedState>({ layout: null, ids: new Set() })

  const graph = useMemo(() => (models.length ? buildGraph(models, links) : null), [models, links])
  const visible = useMemo(
    () => (graph ? computeVisible(graph, options, { focus, hidden }) : null),
    [graph, options, focus, hidden],
  )

  // Layout is recomputed whenever the graph, a view option, the direction or a re-layout request changes.
  const layout = useMemo<Layout | null>(() => {
    void relayoutCount
    if (!visible || !fontsReady) return null
    const geometry = new Map<string, NodeGeometry>()
    for (const node of visible.nodes) geometry.set(node.id, computeGeometry(node, options, false, measure))
    const positions = layoutByFile(
      visible.nodes,
      visible.edges,
      geometry,
      options.direction,
      options.layoutMode,
      options.spacing,
    )
    return { positions, geometry }
  }, [visible, options, fontsReady, measure, relayoutCount])

  const collapsedIds = collapsedState.layout === layout ? collapsedState.ids : NO_COLLAPSED

  const toggleCollapsed = useCallback(
    (id: string) => {
      setCollapsedState((prev) => {
        const ids = new Set(prev.layout === layout ? prev.ids : [])
        if (!ids.delete(id)) ids.add(id)
        return { layout, ids }
      })
    },
    [layout],
  )

  const relayout = useCallback(() => setRelayoutCount((n) => n + 1), [])

  const nodes = useMemo<DiagramNode[]>(() => {
    if (!visible || !layout) return []
    return visible.nodes.flatMap((node) => {
      const position = layout.positions.get(node.id)
      const base = layout.geometry.get(node.id)
      if (!position || !base) return []
      const geometry = collapsedIds.has(node.id) ? computeGeometry(node, options, true, measure) : base
      return [
        {
          id: node.id,
          type: nodeTypeFor(node.kind),
          position,
          width: geometry.width,
          height: geometry.height,
          data: { node, geometry },
        },
      ]
    })
  }, [visible, layout, collapsedIds, options, measure])

  const edges = useMemo<DiagramEdge[]>(() => {
    if (!visible || !graph) return []
    const parallel = computeParallel(visible.edges)
    const nameOf = (id: string) => graph.nodes.get(id)?.name ?? '?'
    return visible.edges.flatMap((edge) => {
      const info = parallel.get(edge.id)
      if (!info) return []
      return [
        {
          id: edge.id,
          type: edgeTypeFor(edge.kind),
          source: edge.from,
          target: edge.to,
          selectable: false,
          focusable: false,
          data: { edge, parallel: info, title: edgeTitle(edge, nameOf) },
        },
      ]
    })
  }, [visible, graph])

  const value = useMemo(
    () => ({ graph, visible, layout, nodes, edges, collapsedIds, toggleCollapsed, relayout }),
    [graph, visible, layout, nodes, edges, collapsedIds, toggleCollapsed, relayout],
  )
  return <DiagramContext.Provider value={value}>{children}</DiagramContext.Provider>
}
