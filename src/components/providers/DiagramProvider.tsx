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
import { portedBeforeLayout, portPredicate } from '@/lib/ecore/ports'
import { deflatePositions, inflateGeometry, portMargins, type PortRoom } from '@/lib/ecore/portRoom'
import { portTagTexts } from '@/lib/ecore/portTag'
import { computeGeometry, createTextMeasurer, waitForFonts } from '@/lib/ecore/measure'
import { runLayout } from '@/lib/ecore/runLayout'
import { layoutEdges } from '@/lib/ecore/shaping'
import { computeParallel, computeVisible } from '@/lib/ecore/visibleGraph'
import type { DrawnEdge } from '@/types/graph'
import type { NodeGeometry, PortMode, ViewOptions } from '@/types/view'

/** A finished layout and the request it answers, so a newer request shows as pending. */
interface LayoutState {
  layout: DiagramLayout
  drawn: DrawnGraph
  options: ViewOptions
  portLayout: PortMode
  portRoom: boolean
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
  const portRoom = display.portRoom
  // The port mode only moves boxes when it decides ports before layout, or when room is kept for long links.
  const portLayout: PortMode =
    display.ports === 'frames' ? 'frames' : portRoom ? display.ports : 'none'
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
      portLayout === 'frames' ? 'frames' : 'none',
      options.grouping,
      ports.overrides,
    ),
    overrides: ports.overrides,
    portsVersion: ports.version,
  }))

  // Layout reruns whenever the graph, a view option, the collapsed packages or a re-layout request changes.
  // Layouts can run in a worker, so a result that arrives after a newer request is dropped.
  useEffect(() => {
    if (!drawn || !fontsReady) return
    let active = true
    const { ported, overrides, portsVersion } = portedForLayout(drawn)
    const geometry = new Map<string, NodeGeometry>()
    for (const node of drawn.nodes) geometry.set(node.id, computeGeometry(node, options, false, measure))
    const edges = drawn.edges.filter((e) => !ported.has(e.id))
    const nodesById = new Map(drawn.nodes.map((n) => [n.id, n]))
    const textsOf = (edge: DrawnEdge) => portTagTexts(edge, (id) => nodesById.get(id)?.name ?? '?')
    const boxesOf = (positions: ReadonlyMap<string, { x: number; y: number }>) => {
      const boxes = new Map<string, Box>()
      positions.forEach((p, id) => {
        const geo = geometry.get(id)
        if (geo) boxes.set(id, { x: p.x, y: p.y, width: geo.width, height: geo.height })
      })
      return boxes
    }

    // Making room for tags lays the boxes out grown by the space their tags need. Long links are only known
    // once boxes are placed, so for those a first layout finds them and a second makes room.
    const place = async () => {
      if (!portRoom) return { ...(await runLayout(drawn.nodes, edges, geometry, options, loadElk)), room: null }
      const tagged = new Set(ported)
      const first = portLayout === 'all' ? null : await runLayout(drawn.nodes, edges, geometry, options, loadElk)
      if (portLayout === 'all') {
        const isPorted = portPredicate(nodesById, 'all', options.grouping, overrides)
        const anywhere: Box = { x: 0, y: 0, width: 0, height: 0 }
        for (const edge of drawn.edges) if (isPorted(edge, anywhere, anywhere)) tagged.add(edge.id)
      }
      if (first && portLayout === 'long') {
        const boxes = boxesOf(first.result.positions)
        const isPorted = portPredicate(nodesById, 'long', options.grouping, overrides)
        for (const edge of drawn.edges) {
          const from = boxes.get(edge.from)
          const to = boxes.get(edge.to)
          if (from && to && isPorted(edge, from, to)) tagged.add(edge.id)
        }
      }
      if (!tagged.size) return { ...(first ?? (await runLayout(drawn.nodes, edges, geometry, options, loadElk))), room: null }
      const tagsOnly = edges.every((e) => tagged.has(e.id) || e.from === e.to)
      const room: PortRoom = portMargins(drawn.edges, tagged, geometry, options.direction, textsOf, tagsOnly)
      const grown = await runLayout(
        drawn.nodes,
        edges,
        inflateGeometry(geometry, room.margins),
        { ...options, tagsOnly },
        loadElk,
      )
      // Routes found for the grown boxes miss the real ones, so links at boxes with tags are drawn square.
      const routes = new Map(grown.result.routes)
      for (const edge of edges) {
        if (room.margins.has(edge.from) || room.margins.has(edge.to)) routes.delete(edge.id)
      }
      return {
        result: { positions: deflatePositions(grown.result.positions, room.margins), routes },
        failure: grown.failure ?? first?.failure ?? null,
        room,
      }
    }

    void place().then(({ result, failure, room }) => {
      if (!active) return
      if (failure) toast.error(`That layout failed, so the classic layered layout is shown instead (${failure}).`)
      setLayoutState({
        layout: {
          positions: result.positions,
          geometry,
          laidOut: { routes: result.routes, boxes: boxesOf(result.positions) },
          room,
        },
        drawn,
        options,
        portLayout,
        portRoom,
        relayoutCount,
        portsVersion,
        ported,
      })
    })
    return () => {
      active = false
    }
  }, [drawn, options, portLayout, portRoom, fontsReady, measure, relayoutCount])

  // The last layout stays on screen while a newer one is worked out; with nothing visible there is none.
  const layout = drawn && fontsReady ? (layoutState?.layout ?? null) : null
  const layoutPending =
    !!drawn &&
    (!layoutState ||
      layoutState.drawn !== drawn ||
      layoutState.options !== options ||
      layoutState.portLayout !== portLayout ||
      layoutState.portRoom !== portRoom ||
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
