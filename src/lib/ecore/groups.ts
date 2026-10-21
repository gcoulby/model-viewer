import type { DrawnNode } from '@/types/graph'
import type { LayoutGrouping } from '@/types/view'
import type { Margins } from './portRoom'

export const EXTERNAL_GROUP = '~external'
export const GROUP_PADDING = 28
export const GROUP_LABEL_HEIGHT = 30

/** The frame a node belongs to, or null when nodes are not grouped. */
export function groupKeyOf(node: DrawnNode, grouping: LayoutGrouping): string | null {
  if (grouping === 'none') return null
  if (node.kind === 'external') return EXTERNAL_GROUP
  return grouping === 'file' ? node.package.fileKey : node.package.id
}

export function groupLabelOf(node: DrawnNode, grouping: LayoutGrouping): string {
  if (node.kind === 'external') return 'External'
  return grouping === 'package' ? node.package.fullName : node.package.fileName
}

/** The file whose colour tints the frame, or null for the externals frame. */
export function groupHueKeyOf(node: DrawnNode): string | null {
  return node.kind === 'external' ? null : node.package.fileKey
}

/** Frames are only drawn once there is more than one file or package on the diagram to tell apart. */
export function groupingActive(nodes: DrawnNode[], grouping: LayoutGrouping): boolean {
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
  node: DrawnNode
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

/** One padded frame per file or package around the nodes currently placed in it and the space kept for their tags. */
export function computeGroupBoxes(
  placed: PlacedNode[],
  grouping: LayoutGrouping,
  margins?: ReadonlyMap<string, Margins>,
): GroupBox[] {
  if (!groupingActive(placed.map((p) => p.node), grouping)) return []
  const bounds = new Map<string, GroupBox & { maxX: number; maxY: number }>()
  for (const p of placed) {
    const { node } = p
    const key = groupKeyOf(node, grouping)
    if (!key) continue
    const m = margins?.get(node.id)
    const x = p.x - (m?.left ?? 0)
    const y = p.y - (m?.top ?? 0)
    const width = p.width + (m ? m.left + m.right : 0)
    const height = p.height + (m ? m.top + m.bottom : 0)
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
