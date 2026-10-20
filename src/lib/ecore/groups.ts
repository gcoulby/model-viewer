import type { GraphNode } from '@/types/graph'

export const EXTERNAL_GROUP = '~external'
export const GROUP_PADDING = 28
export const GROUP_LABEL_HEIGHT = 30

export function groupKeyOf(node: GraphNode): string {
  return node.kind === 'external' ? EXTERNAL_GROUP : node.package.fileKey
}

export function groupLabelOf(node: GraphNode): string {
  return node.kind === 'external' ? 'External' : node.package.fileName
}

/** Files are only boxed apart once there is more than one of them on the diagram. */
export function groupingActive(nodes: GraphNode[]): boolean {
  const files = new Set<string>()
  for (const node of nodes) if (node.kind !== 'external') files.add(node.package.fileKey)
  return files.size > 1
}

export interface PlacedNode {
  node: GraphNode
  x: number
  y: number
  width: number
  height: number
}

export interface GroupBox {
  /** A file key, or `EXTERNAL_GROUP`. */
  key: string
  label: string
  x: number
  y: number
  width: number
  height: number
}

/** One padded box per file around the nodes currently placed in it. */
export function computeGroupBoxes(placed: PlacedNode[]): GroupBox[] {
  if (!groupingActive(placed.map((p) => p.node))) return []
  const bounds = new Map<string, GroupBox & { maxX: number; maxY: number }>()
  for (const { node, x, y, width, height } of placed) {
    const key = groupKeyOf(node)
    const box = bounds.get(key)
    if (!box) {
      bounds.set(key, { key, label: groupLabelOf(node), x, y, width: 0, height: 0, maxX: x + width, maxY: y + height })
    } else {
      box.x = Math.min(box.x, x)
      box.y = Math.min(box.y, y)
      box.maxX = Math.max(box.maxX, x + width)
      box.maxY = Math.max(box.maxY, y + height)
    }
  }
  return [...bounds.values()].map((b) => ({
    key: b.key,
    label: b.label,
    x: b.x - GROUP_PADDING,
    y: b.y - GROUP_PADDING - GROUP_LABEL_HEIGHT,
    width: b.maxX - b.x + GROUP_PADDING * 2,
    height: b.maxY - b.y + GROUP_PADDING * 2 + GROUP_LABEL_HEIGHT,
  }))
}
