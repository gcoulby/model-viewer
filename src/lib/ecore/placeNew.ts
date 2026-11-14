import type { DrawnNode } from '@/types/graph'
import type { NodeGeometry } from '@/types/view'
import type { Position } from './layout'

const GAP = 40

const groupOf = (node: DrawnNode) => ('package' in node ? node.package.id : node.kind)

/**
 * Places boxes that are not in a frozen layout, so an edit adds to the diagram without moving anything
 * already there. A new box goes under the lowest box of its own package, or to the right of everything
 * when its package has none yet.
 */
export function placeNewNodes(
  nodes: DrawnNode[],
  positions: ReadonlyMap<string, Position>,
  geometryOf: (node: DrawnNode) => NodeGeometry,
): Map<string, Position> {
  const placed = new Map<string, Position>()
  const boxes: { group: string; x: number; y: number; width: number; height: number }[] = []
  for (const node of nodes) {
    const p = positions.get(node.id)
    if (!p) continue
    const { width, height } = geometryOf(node)
    boxes.push({ group: groupOf(node), x: p.x, y: p.y, width, height })
  }
  if (!boxes.length) return placed

  for (const node of nodes) {
    if (positions.has(node.id)) continue
    const group = groupOf(node)
    const siblings = boxes.filter((b) => b.group === group)
    let position: Position
    if (siblings.length) {
      const lowest = siblings.reduce((a, b) => (b.y + b.height > a.y + a.height ? b : a))
      position = { x: lowest.x, y: lowest.y + lowest.height + GAP }
    } else {
      const right = Math.max(...boxes.map((b) => b.x + b.width))
      const top = Math.min(...boxes.map((b) => b.y))
      position = { x: right + GAP * 2, y: top }
    }
    const { width, height } = geometryOf(node)
    placed.set(node.id, position)
    boxes.push({ group, ...position, width, height })
  }
  return placed
}
