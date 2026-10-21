import dagre from '@dagrejs/dagre'
import { spacingFactor } from '@/data/layoutOptions'
import type { GraphEdge, GraphNode } from '@/types/graph'
import type { LayoutSettings, NodeGeometry } from '@/types/view'
import type { Point } from './edgeGeometry'

export type Position = Point

export interface LayoutResult {
  positions: Map<string, Position>
  /**
   * Paths the layout engine found, keyed by edge id, running from the edge's `from` box to its `to` box.
   * They are only valid while both boxes stay where the layout put them.
   */
  routes: Map<string, Point[]>
}

const NODE_SEP = 48
const RANK_SEP = 90
const GRID_GAP = 34
const GRID_MIN_WIDTH = 900
const GRID_FALLBACK_WIDTH = 1400
const GRID_CLEARANCE = 90

const KIND_ORDER: Record<GraphNode['kind'], number> = { class: 0, enum: 1, datatype: 2, external: 3 }

function packageName(node: GraphNode): string {
  return node.kind === 'external' ? '~' : node.package.fullName
}

export function compareNodes(a: GraphNode, b: GraphNode): number {
  return KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.name.localeCompare(b.name)
}

/** Package by package, externals last, then as `compareNodes`. */
export function comparePackages(a: GraphNode, b: GraphNode): number {
  return (
    packageName(a).localeCompare(packageName(b)) ||
    (a.kind === 'external' ? 1 : 0) - (b.kind === 'external' ? 1 : 0) ||
    compareNodes(a, b)
  )
}

function placeGrid(
  nodes: GraphNode[],
  geometry: Map<string, NodeGeometry>,
  positions: Map<string, Position>,
  originX: number,
  originY: number,
  maxWidth: number,
  gap: number,
) {
  let x = originX
  let y = originY
  let rowHeight = 0
  for (const node of nodes) {
    const geo = geometry.get(node.id)
    if (!geo) continue
    if (x > originX && x + geo.width > originX + maxWidth) {
      x = originX
      y += rowHeight + gap
      rowHeight = 0
    }
    positions.set(node.id, { x, y })
    x += geo.width + gap
    rowHeight = Math.max(rowHeight, geo.height)
  }
}

/**
 * Top-left positions for every node: nodes joined by `edges` layered by dagre, the rest in a grid
 * below. `edges` are the ones that shape the layout (see `layoutEdges`); no other edge is read.
 */
export function layoutDagre(
  nodes: GraphNode[],
  edges: GraphEdge[],
  geometry: Map<string, NodeGeometry>,
  settings: Pick<LayoutSettings, 'direction' | 'spacing' | 'algorithm'>,
): LayoutResult {
  const positions = new Map<string, Position>()
  const routes = new Map<string, Point[]>()
  const factor = spacingFactor(settings.spacing)
  const gridGap = GRID_GAP * factor
  const compare = settings.algorithm === 'grid' ? comparePackages : compareNodes
  const linked = new Set<string>()
  for (const e of edges) {
    linked.add(e.from)
    linked.add(e.to)
  }
  const connected = nodes.filter((n) => linked.has(n.id))
  let isolated = nodes.filter((n) => !linked.has(n.id)).sort(compare)

  let laidOut = false
  let bounds = { minX: 0, maxX: 0, maxY: 0 }
  if (connected.length) {
    try {
      const g = new dagre.graphlib.Graph()
      g.setGraph({
        rankdir: settings.direction,
        nodesep: NODE_SEP * factor,
        ranksep: RANK_SEP * factor,
        marginx: 0,
        marginy: 0,
      })
      g.setDefaultEdgeLabel(() => ({}))
      for (const n of connected) {
        const geo = geometry.get(n.id)
        if (geo) g.setNode(n.id, { width: geo.width, height: geo.height })
      }
      // dagre fails on parallel edges between neighbouring boxes, so each pair of boxes gets one edge
      // carrying the weight of all of them. Supertypes rank above subtypes, so inheritance runs super to sub.
      const pairs = new Map<string, { v: string; w: string; weight: number; ids: string[] }>()
      for (const e of edges) {
        if (e.from === e.to || !g.hasNode(e.from) || !g.hasNode(e.to)) continue
        const v = e.kind === 'inherit' ? e.to : e.from
        const w = e.kind === 'inherit' ? e.from : e.to
        const key = v < w ? `${v}\n${w}` : `${w}\n${v}`
        const pair = pairs.get(key)
        const weight = e.kind === 'inherit' ? 3 : 1
        if (pair) {
          pair.weight += weight
          pair.ids.push(e.id)
        } else pairs.set(key, { v, w, weight, ids: [e.id] })
      }
      for (const { v, w, weight } of pairs.values()) g.setEdge(v, w, { weight, minlen: 1 })
      dagre.layout(g)
      const placed = new Map<string, Position>()
      let minX = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const n of connected) {
        const geo = geometry.get(n.id)
        const p = g.node(n.id)
        if (!geo || !p) continue
        const at = { x: p.x - geo.width / 2, y: p.y - geo.height / 2 }
        placed.set(n.id, at)
        minX = Math.min(minX, at.x)
        maxX = Math.max(maxX, at.x + geo.width)
        maxY = Math.max(maxY, at.y + geo.height)
      }
      if ([minX, maxX, maxY].every(Number.isFinite)) {
        placed.forEach((p, id) => positions.set(id, p))
        bounds = { minX, maxX, maxY }
        laidOut = true
        const byId = new Map(edges.map((e) => [e.id, e]))
        for (const { v, w, ids } of pairs.values()) {
          const edge = ids.length === 1 ? byId.get(ids[0] ?? '') : undefined
          const points: Point[] | undefined = edge ? g.edge(v, w)?.points : undefined
          if (!edge || !points?.length || !points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) continue
          const copy = points.map((p) => ({ x: p.x, y: p.y }))
          routes.set(edge.id, edge.from === v ? copy : copy.reverse())
        }
      }
    } catch {
      laidOut = false
    }
  }

  if (!laidOut) {
    routes.clear()
    isolated = [...nodes].sort(compare)
    placeGrid(isolated, geometry, positions, 0, 0, GRID_FALLBACK_WIDTH, gridGap)
  } else if (isolated.length) {
    const width = Math.max(GRID_MIN_WIDTH, bounds.maxX - bounds.minX)
    placeGrid(isolated, geometry, positions, bounds.minX, bounds.maxY + GRID_CLEARANCE, width, gridGap)
  }
  return { positions, routes }
}
