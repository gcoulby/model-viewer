import dagre from '@dagrejs/dagre'
import type { GraphEdge, GraphNode } from '@/types/graph'
import { LAYOUT_SPACINGS } from '@/data/layoutOptions'
import type { LayoutDirection, LayoutMode, LayoutSpacing, NodeGeometry } from '@/types/view'

export interface Position {
  x: number
  y: number
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

function compareNodes(a: GraphNode, b: GraphNode): number {
  return KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.name.localeCompare(b.name)
}

function comparePackages(a: GraphNode, b: GraphNode): number {
  return (
    packageName(a).localeCompare(packageName(b)) ||
    (a.kind === 'external' ? 1 : 0) - (b.kind === 'external' ? 1 : 0) ||
    compareNodes(a, b)
  )
}

/** The edges that decide where boxes go; the rest are only drawn over the result. */
function shapesLayout(edge: GraphEdge, mode: LayoutMode): boolean {
  switch (mode) {
    case 'layered':
      return true
    case 'structure':
      return edge.kind === 'inherit' || edge.kind === 'containment'
    case 'inheritance':
      return edge.kind === 'inherit'
    case 'grid':
      return false
  }
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

/** Top-left positions for every node: connected nodes layered by dagre, the rest in a grid below. */
export function layoutNodes(
  nodes: GraphNode[],
  edges: GraphEdge[],
  geometry: Map<string, NodeGeometry>,
  direction: LayoutDirection,
  mode: LayoutMode = 'layered',
  spacing: LayoutSpacing = 'normal',
): Map<string, Position> {
  const positions = new Map<string, Position>()
  const factor = LAYOUT_SPACINGS.find((s) => s.value === spacing)?.factor ?? 1
  const gridGap = GRID_GAP * factor
  const compare = mode === 'grid' ? comparePackages : compareNodes
  edges = edges.filter((e) => shapesLayout(e, mode))
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
      const g = new dagre.graphlib.Graph({ multigraph: true })
      g.setGraph({ rankdir: direction, nodesep: NODE_SEP * factor, ranksep: RANK_SEP * factor, marginx: 0, marginy: 0 })
      g.setDefaultEdgeLabel(() => ({}))
      for (const n of connected) {
        const geo = geometry.get(n.id)
        if (geo) g.setNode(n.id, { width: geo.width, height: geo.height })
      }
      edges.forEach((e, i) => {
        if (e.from === e.to) return
        if (e.kind === 'inherit') g.setEdge(e.to, e.from, { weight: 3, minlen: 1 }, `e${i}`)
        else g.setEdge(e.from, e.to, { weight: 1, minlen: 1 }, `e${i}`)
      })
      dagre.layout(g)
      const placed = new Map<string, Position>()
      for (const n of connected) {
        const geo = geometry.get(n.id)
        const p = g.node(n.id)
        if (!geo || !p) continue
        placed.set(n.id, { x: p.x - geo.width / 2, y: p.y - geo.height / 2 })
      }
      let minX = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const n of connected) {
        const geo = geometry.get(n.id)
        const p = placed.get(n.id)
        if (!geo || !p) continue
        minX = Math.min(minX, p.x)
        maxX = Math.max(maxX, p.x + geo.width)
        maxY = Math.max(maxY, p.y + geo.height)
      }
      if ([minX, maxX, maxY].every(Number.isFinite)) {
        placed.forEach((p, id) => positions.set(id, p))
        bounds = { minX, maxX, maxY }
        laidOut = true
      }
    } catch {
      laidOut = false
    }
  }

  if (!laidOut) {
    isolated = [...nodes].sort(compare)
    placeGrid(isolated, geometry, positions, 0, 0, GRID_FALLBACK_WIDTH, gridGap)
  } else if (isolated.length) {
    const width = Math.max(GRID_MIN_WIDTH, bounds.maxX - bounds.minX)
    placeGrid(isolated, geometry, positions, bounds.minX, bounds.maxY + GRID_CLEARANCE, width, gridGap)
  }
  return positions
}
