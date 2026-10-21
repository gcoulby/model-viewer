import { spacingFactor } from '@/data/layoutOptions'
import type { GraphEdge, GraphNode } from '@/types/graph'
import type { LayoutSettings, NodeGeometry } from '@/types/view'
import type { Point } from './edgeGeometry'
import { EXTERNAL_GROUP, GROUP_LABEL_HEIGHT, GROUP_PADDING, groupKeyOf, groupingActive } from './groups'
import { layoutDagre, type LayoutResult } from './layout'
import { layoutEdges } from './shaping'

const BLOCK_GAP = 70
const ROW_ASPECT = 1.6

interface Block {
  members: GraphNode[]
  result: LayoutResult
  minX: number
  minY: number
  width: number
  height: number
}

function layoutBlock(
  members: GraphNode[],
  edges: GraphEdge[],
  geometry: Map<string, NodeGeometry>,
  settings: LayoutSettings,
): Block {
  const ids = new Set(members.map((n) => n.id))
  const inner = edges.filter((e) => ids.has(e.from) && ids.has(e.to))
  const result = layoutDagre(members, inner, geometry, settings)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of members) {
    const p = result.positions.get(n.id)
    const geo = geometry.get(n.id)
    if (!p || !geo) continue
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x + geo.width)
    maxY = Math.max(maxY, p.y + geo.height)
  }
  if (!Number.isFinite(minX)) return { members, result, minX: 0, minY: 0, width: 0, height: 0 }
  return {
    members,
    result,
    minX,
    minY,
    width: maxX - minX + GROUP_PADDING * 2,
    height: maxY - minY + GROUP_PADDING * 2 + GROUP_LABEL_HEIGHT,
  }
}

/**
 * The dagre layout. When nodes are grouped, each file or package is laid out on its own and the blocks
 * are packed in rows, so groups stay visually apart; edges between groups are only drawn over the result.
 */
export function layoutWithDagre(
  nodes: GraphNode[],
  edges: GraphEdge[],
  geometry: Map<string, NodeGeometry>,
  settings: LayoutSettings,
): LayoutResult {
  const shaping = layoutEdges(nodes, edges, settings)
  if (!groupingActive(nodes, settings.grouping)) return layoutDagre(nodes, shaping, geometry, settings)

  const groups = new Map<string, GraphNode[]>()
  for (const node of nodes) {
    const key = groupKeyOf(node, settings.grouping) ?? ''
    const list = groups.get(key)
    if (list) list.push(node)
    else groups.set(key, [node])
  }
  const keys = [...groups.keys()].sort((a, b) =>
    a === EXTERNAL_GROUP ? 1 : b === EXTERNAL_GROUP ? -1 : a.localeCompare(b),
  )
  const blocks = keys.map((k) => layoutBlock(groups.get(k) ?? [], shaping, geometry, settings))

  const gap = BLOCK_GAP * spacingFactor(settings.spacing)
  const area = blocks.reduce((sum, b) => sum + (b.width + gap) * (b.height + gap), 0)
  const rowWidth = Math.max(...blocks.map((b) => b.width), Math.sqrt(area) * ROW_ASPECT)

  const positions = new Map<string, Point>()
  const routes = new Map<string, Point[]>()
  let x = 0
  let y = 0
  let rowHeight = 0
  for (const block of blocks) {
    if (x > 0 && x + block.width > rowWidth) {
      x = 0
      y += rowHeight + gap
      rowHeight = 0
    }
    const dx = x + GROUP_PADDING - block.minX
    const dy = y + GROUP_PADDING + GROUP_LABEL_HEIGHT - block.minY
    for (const n of block.members) {
      const p = block.result.positions.get(n.id)
      if (p) positions.set(n.id, { x: p.x + dx, y: p.y + dy })
    }
    block.result.routes.forEach((points, id) => {
      routes.set(
        id,
        points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
      )
    })
    x += block.width + gap
    rowHeight = Math.max(rowHeight, block.height)
  }
  return { positions, routes }
}
