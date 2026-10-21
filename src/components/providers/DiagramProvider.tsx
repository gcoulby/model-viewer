import { useCallback, useEffect, useEffectEvent, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { edgeTypeFor, type DiagramEdge } from '@/components/canvas/edges/edgeTypes'
import { nodeTypeFor, type DiagramNode } from '@/components/canvas/nodes/nodeTypes'
import { DiagramContext, type DiagramLayout } from '@/contexts/diagram-context'
import { useModels } from '@/hooks/useModels'
import { usePorts } from '@/hooks/usePorts'
import { useScope } from '@/hooks/useScope'
import { useViewOptions } from '@/hooks/useViewOptions'
import { loadElk } from '@/lib/elk'
import { buildGraph } from '@/lib/ecore/buildGraph'
import type { Box } from '@/lib/ecore/edgeGeometry'
import { edgeTitle } from '@/lib/ecore/edgeStyle'
import { foldPackages, type DrawnGraph } from '@/lib/ecore/fold'
import { portedBeforeLayout } from '@/lib/ecore/ports'
import { computeGeometry, createTextMeasurer, waitForFonts } from '@/lib/ecore/measure'
import { runLayout } from '@/lib/ecore/runLayout'
import { layoutEdges } from '@/lib/ecore/shaping'
import { computeParallel, computeVisible } from '@/lib/ecore/visibleGraph'
import type { NodeGeometry, ViewOptions } from '@/types/view'

/** A finished layout and the request it answers, so a newer request shows as pending. */
interface LayoutState {
  layout: DiagramLayout
  drawn: DrawnGraph
  options: ViewOptions
  portFrames: boolean
  relayoutCount: number
  portsVersion: number
  /** The links left out of this layout because they were ported. */
  ported: ReadonlySet<string>
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
  const { options, display } = useViewOptions()
  const { focus, hidden, folded } = useScope()
  const ports = usePorts()
  const portFrames = display.ports === 'frames'
  const fontsReady = useFontsReady()
  const measure = useMemo(createTextMeasurer, [])
  const [relayoutCount, setRelayoutCount] = useState(0)
  const [layoutState, setLayoutState] = useState<LayoutState | null>(null)
  const [collapsedState, setCollapsedState] = useState<CollapsedState>({ layout: null, ids: new Set() })

  const graph = useMemo(() => (models.length ? buildGraph(models, links) : null), [models, links])
  const visible = useMemo(
    () => (graph ? computeVisible(graph, options, { focus, hidden, folded }) : null),
    [graph, options, focus, hidden, folded],
  )
  const drawn = useMemo(() => (visible ? foldPackages(visible, folded) : null), [visible, folded])

  // Ported links take no part in the layout, so the parts they join are placed apart. Links ported by hand
  // are read as a layout starts, but porting one does not start a layout; it marks the layout stale instead.
  const portedForLayout = useEffectEvent((graph: DrawnGraph) => ({
    ported: portedBeforeLayout(
      graph.edges,
      new Map(graph.nodes.map((n) => [n.id, n])),
      portFrames ? 'frames' : 'none',
      options.grouping,
      ports.overrides,
    ),
    portsVersion: ports.version,
  }))

  // Layout reruns whenever the graph, a view option, the collapsed packages or a re-layout request changes.
  // Layouts can run in a worker, so a result that arrives after a newer request is dropped.
  useEffect(() => {
    if (!drawn || !fontsReady) return
    let active = true
    const { ported, portsVersion } = portedForLayout(drawn)
    const geometry = new Map<string, NodeGeometry>()
    for (const node of drawn.nodes) geometry.set(node.id, computeGeometry(node, options, false, measure))
    const edges = drawn.edges.filter((e) => !ported.has(e.id))
    void runLayout(drawn.nodes, edges, geometry, options, loadElk).then(({ result, failure }) => {
      if (!active) return
      if (failure) toast.error(`That layout failed, so the classic layered layout is shown instead (${failure}).`)
      const boxes = new Map<string, Box>()
      result.positions.forEach((p, id) => {
        const geo = geometry.get(id)
        if (geo) boxes.set(id, { x: p.x, y: p.y, width: geo.width, height: geo.height })
      })
      setLayoutState({
        layout: { positions: result.positions, geometry, laidOut: { routes: result.routes, boxes } },
        drawn,
        options,
        portFrames,
        relayoutCount,
        portsVersion,
        ported,
      })
    })
    return () => {
      active = false
    }
  }, [drawn, options, portFrames, fontsReady, measure, relayoutCount])

  // The last layout stays on screen while a newer one is worked out; with nothing visible there is none.
  const layout = drawn && fontsReady ? (layoutState?.layout ?? null) : null
  const layoutPending =
    !!drawn &&
    (!layoutState ||
      layoutState.drawn !== drawn ||
      layoutState.options !== options ||
      layoutState.portFrames !== portFrames ||
      layoutState.relayoutCount !== relayoutCount)
  const layoutStale = !!layoutState && layoutState.portsVersion !== ports.version

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
    if (!drawn || !layout) return []
    return drawn.nodes.flatMap((node) => {
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
  }, [drawn, layout, collapsedIds, options, measure])

  const laidOutPorted = layoutState?.ported
  const shapingEdgeIds = useMemo<ReadonlySet<string>>(() => {
    if (!drawn) return new Set()
    const edges = laidOutPorted ? drawn.edges.filter((e) => !laidOutPorted.has(e.id)) : drawn.edges
    return new Set(layoutEdges(drawn.nodes, edges, options).map((e) => e.id))
  }, [drawn, options, laidOutPorted])

  const edges = useMemo<DiagramEdge[]>(() => {
    if (!drawn || !graph) return []
    const parallel = computeParallel(drawn.edges)
    const nameOf = (id: string) => graph.nodes.get(id)?.name ?? drawn.nodes.find((n) => n.id === id)?.name ?? '?'
    return drawn.edges.flatMap((edge) => {
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
          data: { edge, parallel: info, title: edgeTitle(edge, nameOf), path: null, labels: true, portTexts: null },
        },
      ]
    })
  }, [drawn, graph])

  const value = useMemo(
    () => ({
      graph,
      visible,
      drawn,
      layout,
      layoutPending,
      layoutStale,
      nodes,
      edges,
      shapingEdgeIds,
      collapsedIds,
      toggleCollapsed,
      relayout,
    }),
    [
      graph,
      visible,
      drawn,
      layout,
      layoutPending,
      layoutStale,
      nodes,
      edges,
      shapingEdgeIds,
      collapsedIds,
      toggleCollapsed,
      relayout,
    ],
  )
  return <DiagramContext.Provider value={value}>{children}</DiagramContext.Provider>
}
