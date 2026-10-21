import type { GraphNode } from '@/types/graph'
import type { LayoutGrouping } from '@/types/view'

export const EXTERNAL_GROUP = '~external'
export const GROUP_PADDING = 28
export const GROUP_LABEL_HEIGHT = 30

/** The frame a node belongs to, or null when nodes are not grouped. */
export function groupKeyOf(node: GraphNode, grouping: LayoutGrouping): string | null {
  if (grouping === 'none') return null
  if (node.kind === 'external') return EXTERNAL_GROUP
  return grouping === 'file' ? node.package.fileKey : node.package.id
}

export function groupLabelOf(node: GraphNode, grouping: LayoutGrouping): string {
  if (node.kind === 'external') return 'External'
  return grouping === 'package' ? node.package.fullName : node.package.fileName
}

/** The file whose colour tints the frame, or null for the externals frame. */
export function groupHueKeyOf(node: GraphNode): string | null {
  return node.kind === 'external' ? null : node.package.fileKey
}

/** Frames are only drawn once there is more than one file or package on the diagram to tell apart. */
export function groupingActive(nodes: GraphNode[], grouping: LayoutGrouping): boolean {
  if (grouping === 'none') return false
  const keys = new Set<string>()
  for (const node of nodes) {
    const key = node.kind === 'external' ? null : groupKeyOf(node, grouping)
    if (key) keys.add(key)
    if (keys.size > 1) return true
  }
  return false
}

export interface PlacedNode {
  node: GraphNode
  x: number
  y: number
  width: number
  height: number
}

export interface GroupBox {
  /** A file key, a package id, or `EXTERNAL_GROUP`. */
  key: string
  label: string
  hueKey: string | null
  x: number
  y: number
  width: number
  height: number
}

/** One padded frame per file or package around the nodes currently placed in it. */
export function computeGroupBoxes(placed: PlacedNode[], grouping: LayoutGrouping): GroupBox[] {
  if (!groupingActive(placed.map((p) => p.node), grouping)) return []
  const bounds = new Map<string, GroupBox & { maxX: number; maxY: number }>()
  for (const { node, x, y, width, height } of placed) {
    const key = groupKeyOf(node, grouping)
    if (!key) continue
    const box = bounds.get(key)
    if (!box) {
      bounds.set(key, {
        key,
        label: groupLabelOf(node, grouping),
        hueKey: groupHueKeyOf(node),
        x,
        y,
        width: 0,
        height: 0,
        maxX: x + width,
        maxY: y + height,
      })
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
    hueKey: b.hueKey,
    x: b.x - GROUP_PADDING,
    y: b.y - GROUP_PADDING - GROUP_LABEL_HEIGHT,
    width: b.maxX - b.x + GROUP_PADDING * 2,
    height: b.maxY - b.y + GROUP_PADDING * 2 + GROUP_LABEL_HEIGHT,
  }))
}
