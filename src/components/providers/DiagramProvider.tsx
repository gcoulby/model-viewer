import { useCallback, useEffect, useEffectEvent, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { edgeTypeFor, type DiagramEdge } from '@/components/canvas/edges/edgeTypes'
import { nodeTypeFor, type DiagramNode } from '@/components/canvas/nodes/nodeTypes'
import { DiagramContext, type DiagramLayout } from '@/contexts/diagram-context'
import { useEditorMode } from '@/hooks/useEditorMode'
import { useModels } from '@/hooks/useModels'
import { usePorts } from '@/hooks/usePorts'
import { useScope } from '@/hooks/useScope'
import { useViewOptions } from '@/hooks/useViewOptions'
import { loadElk } from '@/lib/elk'
import { buildGraph } from '@/lib/ecore/buildGraph'
import { buildObjectGraph } from '@/lib/instance/objectGraph'
import { useInstances } from '@/hooks/useInstances'
import type { Box } from '@/lib/ecore/edgeGeometry'
import { edgeTitle } from '@/lib/ecore/edgeStyle'
import { foldPackages, type DrawnGraph } from '@/lib/ecore/fold'
import { portedBeforeLayout, portPredicate } from '@/lib/ecore/ports'
import { deflatePositions, inflateGeometry, portMargins, type PortRoom } from '@/lib/ecore/portRoom'
import { portTagTexts } from '@/lib/ecore/portTag'
import { computeGeometry, createTextMeasurer, waitForFonts } from '@/lib/ecore/measure'
import { placeNewNodes } from '@/lib/ecore/placeNew'
import { runLayout } from '@/lib/ecore/runLayout'
import { layoutEdges } from '@/lib/ecore/shaping'
import { computeParallel, computeVisible } from '@/lib/ecore/visibleGraph'
import type { DrawnEdge, DrawnNode } from '@/types/graph'
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
  /** The workspace epoch and package scope it was laid out for; edits within them keep the layout. */
  epoch: number
  /** The mode it was laid out in: a different mode draws a different diagram. */
  mode: string
  scope: unknown[]
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
  const { models, links, epoch, renamedFrom } = useModels()
  const { mode } = useEditorMode()
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

  const { meta, instanceFiles } = useInstances()
  // Instance mode draws the objects; the other modes draw the metamodels.
  const graph = useMemo(() => {
    if (mode === 'instance') return meta && instanceFiles.length ? buildObjectGraph(meta, instanceFiles) : null
    return models.length ? buildGraph(models, links) : null
  }, [mode, meta, instanceFiles, models, links])
  const visible = useMemo(
    () => (graph ? computeVisible(graph, options, { focus, hidden, folded }) : null),
    [graph, options, focus, hidden, folded],
  )
  const drawn = useMemo(() => (visible ? foldPackages(visible, folded) : null), [visible, folded])
  const scope = useMemo(() => [focus, hidden, folded], [focus, hidden, folded])

  // In edit mode, a change that only comes from editing keeps the boxes where they are: the layout is
  // frozen, new boxes are placed beside their package, and Re-layout tidies up when asked.
  const sameRequest = (state: LayoutState) =>
    state.options === options &&
    state.portLayout === portLayout &&
    state.portRoom === portRoom &&
    state.relayoutCount === relayoutCount
  const frozen =
    mode !== 'view' &&
    !!layoutState &&
    layoutState.mode === mode &&
    layoutState.drawn !== drawn &&
    layoutState.epoch === epoch &&
    layoutState.scope.every((part, i) => part === scope[i]) &&
    sameRequest(layoutState)
  const upToDate = (state: LayoutState | null) => !!state && (frozen || (state.drawn === drawn && sameRequest(state)))
  const layoutCurrent = useEffectEvent(() => upToDate(layoutState))

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
    if (!drawn || !fontsReady || layoutCurrent()) return
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
        epoch,
        scope,
        mode,
      })
    })
    return () => {
      active = false
    }
    // `mode` reruns this on leaving edit mode, so view mode lays out what was edited.
  }, [drawn, options, portLayout, portRoom, fontsReady, measure, relayoutCount, mode, epoch, scope])

  // The last layout stays on screen while a newer one is worked out; with nothing visible there is none.
  const layout = drawn && fontsReady ? (layoutState?.layout ?? null) : null
  const layoutPending = !!drawn && !upToDate(layoutState)
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
    // A frozen layout was measured for the boxes before the edit, so boxes are measured afresh.
    const geometryOf = (node: DrawnNode) =>
      (!frozen && layout.geometry.get(node.id)) || computeGeometry(node, options, false, measure)
    // A class renamed or moved since the layout keeps its box, found under the id it was laid out with.
    const laidOut = (id: string) => {
      const was = renamedFrom.get(id)
      return layout.positions.get(id) ?? (was === undefined ? undefined : layout.positions.get(was))
    }
    const kept = frozen ? new Map(drawn.nodes.flatMap((n) => { const p = laidOut(n.id); return p ? [[n.id, p] as const] : [] })) : layout.positions
    const placed = frozen ? placeNewNodes(drawn.nodes, kept, geometryOf) : null
    return drawn.nodes.flatMap((node) => {
      const position = kept.get(node.id) ?? placed?.get(node.id)
      const base = position && geometryOf(node)
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
  }, [drawn, layout, collapsedIds, options, measure, frozen, renamedFrom])

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
