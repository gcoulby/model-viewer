import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { edgeTypeFor, type DiagramEdge } from '@/components/canvas/edges/edgeTypes'
import { nodeTypeFor, type DiagramNode } from '@/components/canvas/nodes/nodeTypes'
import { DiagramContext, type DiagramLayout } from '@/contexts/diagram-context'
import { useModels } from '@/hooks/useModels'
import { useScope } from '@/hooks/useScope'
import { useViewOptions } from '@/hooks/useViewOptions'
import { loadElk } from '@/lib/elk'
import { buildGraph } from '@/lib/ecore/buildGraph'
import type { Box } from '@/lib/ecore/edgeGeometry'
import { edgeTitle } from '@/lib/ecore/edgeStyle'
import { computeGeometry, createTextMeasurer, waitForFonts } from '@/lib/ecore/measure'
import { runLayout } from '@/lib/ecore/runLayout'
import { layoutEdges } from '@/lib/ecore/shaping'
import { computeParallel, computeVisible, type VisibleGraph } from '@/lib/ecore/visibleGraph'
import type { NodeGeometry, ViewOptions } from '@/types/view'

/** A finished layout and the request it answers, so a newer request shows as pending. */
interface LayoutState {
  layout: DiagramLayout
  visible: VisibleGraph
  options: ViewOptions
  relayoutCount: number
}

interface CollapsedState {
  layout: DiagramLayout | null
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
  const [layoutState, setLayoutState] = useState<LayoutState | null>(null)
  const [collapsedState, setCollapsedState] = useState<CollapsedState>({ layout: null, ids: new Set() })

  const graph = useMemo(() => (models.length ? buildGraph(models, links) : null), [models, links])
  const visible = useMemo(
    () => (graph ? computeVisible(graph, options, { focus, hidden }) : null),
    [graph, options, focus, hidden],
  )

  // Layout reruns whenever the graph, a view option or a re-layout request changes. Layouts can run in a
  // worker, so a result that arrives after a newer request is dropped.
  useEffect(() => {
    if (!visible || !fontsReady) return
    let active = true
    const geometry = new Map<string, NodeGeometry>()
    for (const node of visible.nodes) geometry.set(node.id, computeGeometry(node, options, false, measure))
    void runLayout(visible.nodes, visible.edges, geometry, options, loadElk).then(({ result, failure }) => {
      if (!active) return
      if (failure) toast.error(`That layout failed, so the classic layered layout is shown instead (${failure}).`)
      const boxes = new Map<string, Box>()
      result.positions.forEach((p, id) => {
        const geo = geometry.get(id)
        if (geo) boxes.set(id, { x: p.x, y: p.y, width: geo.width, height: geo.height })
      })
      setLayoutState({
        layout: { positions: result.positions, geometry, laidOut: { routes: result.routes, boxes } },
        visible,
        options,
        relayoutCount,
      })
    })
    return () => {
      active = false
    }
  }, [visible, options, fontsReady, measure, relayoutCount])

  // The last layout stays on screen while a newer one is worked out; with nothing visible there is none.
  const layout = visible && fontsReady ? (layoutState?.layout ?? null) : null
  const layoutPending =
    !!visible &&
    (!layoutState ||
      layoutState.visible !== visible ||
      layoutState.options !== options ||
      layoutState.relayoutCount !== relayoutCount)

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

  const shapingEdgeIds = useMemo<ReadonlySet<string>>(
    () => new Set(visible ? layoutEdges(visible.nodes, visible.edges, options).map((e) => e.id) : []),
    [visible, options],
  )

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
          data: { edge, parallel: info, title: edgeTitle(edge, nameOf), path: null, labels: true },
        },
      ]
    })
  }, [visible, graph])

  const value = useMemo(
    () => ({
      graph,
      visible,
      layout,
      layoutPending,
      nodes,
      edges,
      shapingEdgeIds,
      collapsedIds,
      toggleCollapsed,
      relayout,
    }),
    [graph, visible, layout, layoutPending, nodes, edges, shapingEdgeIds, collapsedIds, toggleCollapsed, relayout],
  )
  return <DiagramContext.Provider value={value}>{children}</DiagramContext.Provider>
}
