import { LAYOUT_SPACINGS } from '@/data/layoutOptions'
import type { GraphEdge, GraphNode } from '@/types/graph'
import type { LayoutDirection, LayoutMode, LayoutSpacing, NodeGeometry } from '@/types/view'
import { EXTERNAL_GROUP, GROUP_LABEL_HEIGHT, GROUP_PADDING, groupKeyOf, groupingActive } from './groups'
import { layoutNodes, type Position } from './layout'

const BLOCK_GAP = 70
const ROW_ASPECT = 1.6

interface Block {
  members: GraphNode[]
  positions: Map<string, Position>
  minX: number
  minY: number
  width: number
  height: number
}

function layoutBlock(
  members: GraphNode[],
  edges: GraphEdge[],
  geometry: Map<string, NodeGeometry>,
  direction: LayoutDirection,
  mode: LayoutMode,
  spacing: LayoutSpacing,
): Block {
  const ids = new Set(members.map((n) => n.id))
  const inner = edges.filter((e) => ids.has(e.from) && ids.has(e.to))
  const positions = layoutNodes(members, inner, geometry, direction, mode, spacing)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of members) {
    const p = positions.get(n.id)
    const geo = geometry.get(n.id)
    if (!p || !geo) continue
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x + geo.width)
    maxY = Math.max(maxY, p.y + geo.height)
  }
  if (!Number.isFinite(minX)) return { members, positions, minX: 0, minY: 0, width: 0, height: 0 }
  return {
    members,
    positions,
    minX,
    minY,
    width: maxX - minX + GROUP_PADDING * 2,
    height: maxY - minY + GROUP_PADDING * 2 + GROUP_LABEL_HEIGHT,
  }
}

/**
 * Like `layoutNodes`, but with several files each file is laid out on its own and the blocks are packed
 * side by side, so the files stay visually apart. Edges between files are only drawn over the result.
 */
export function layoutByFile(
  nodes: GraphNode[],
  edges: GraphEdge[],
  geometry: Map<string, NodeGeometry>,
  direction: LayoutDirection,
  mode: LayoutMode = 'layered',
  spacing: LayoutSpacing = 'normal',
): Map<string, Position> {
  if (!groupingActive(nodes)) return layoutNodes(nodes, edges, geometry, direction, mode, spacing)

  const groups = new Map<string, GraphNode[]>()
  for (const node of nodes) {
    const key = groupKeyOf(node)
    const list = groups.get(key)
    if (list) list.push(node)
    else groups.set(key, [node])
  }
  const keys = [...groups.keys()].sort((a, b) =>
    a === EXTERNAL_GROUP ? 1 : b === EXTERNAL_GROUP ? -1 : a.localeCompare(b),
  )
  const blocks = keys.map((k) => layoutBlock(groups.get(k) ?? [], edges, geometry, direction, mode, spacing))

  const factor = LAYOUT_SPACINGS.find((s) => s.value === spacing)?.factor ?? 1
  const gap = BLOCK_GAP * factor
  const area = blocks.reduce((sum, b) => sum + (b.width + gap) * (b.height + gap), 0)
  const rowWidth = Math.max(...blocks.map((b) => b.width), Math.sqrt(area) * ROW_ASPECT)

  const positions = new Map<string, Position>()
  let x = 0
  let y = 0
  let rowHeight = 0
  for (const block of blocks) {
    if (x > 0 && x + block.width > rowWidth) {
      x = 0
      y += rowHeight + gap
      rowHeight = 0
    }
    for (const n of block.members) {
      const p = block.positions.get(n.id)
      if (!p) continue
      positions.set(n.id, {
        x: x + GROUP_PADDING + (p.x - block.minX),
        y: y + GROUP_PADDING + GROUP_LABEL_HEIGHT + (p.y - block.minY),
      })
    }
    x += block.width + gap
    rowHeight = Math.max(rowHeight, block.height)
  }
  return positions
}
