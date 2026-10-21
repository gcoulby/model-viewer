import type { DrawnEdge, DrawnNode } from '@/types/graph'
import type { LayoutGrouping, PortMode } from '@/types/view'
import type { Box } from './edgeGeometry'
import { groupKeyOf } from './groups'

/** Box centres further apart than this make a long link. */
const LONG_LINK = 900

/** Per-link choices made by hand: true ports a link, false draws it as a line whatever the mode says. */
export type PortOverrides = ReadonlyMap<string, boolean>

/** The frame that counts for porting; with no frames shown, packages stand in for them. */
function portFrameOf(node: DrawnNode | undefined, grouping: LayoutGrouping): string | null {
  return node ? groupKeyOf(node, grouping === 'none' ? 'package' : grouping) : null
}

function crossesFrames(edge: DrawnEdge, nodes: ReadonlyMap<string, DrawnNode>, grouping: LayoutGrouping): boolean {
  const a = portFrameOf(nodes.get(edge.from), grouping)
  const b = portFrameOf(nodes.get(edge.to), grouping)
  return a !== null && b !== null && a !== b
}

/** Links ported before layout, which therefore take no part in placing boxes. `long` is decided after layout. */
export function portedBeforeLayout(
  edges: DrawnEdge[],
  nodes: ReadonlyMap<string, DrawnNode>,
  mode: PortMode,
  grouping: LayoutGrouping,
  overrides: PortOverrides,
): Set<string> {
  const ported = new Set<string>()
  for (const edge of edges) {
    const chosen = overrides.get(edge.id)
    if (chosen ?? (mode === 'frames' && crossesFrames(edge, nodes, grouping))) ported.add(edge.id)
  }
  return ported
}

/** Decides, as links are drawn, which ones are ported. */
export function portPredicate(
  nodes: ReadonlyMap<string, DrawnNode>,
  mode: PortMode,
  grouping: LayoutGrouping,
  overrides: PortOverrides,
): (edge: DrawnEdge, from: Box, to: Box) => boolean {
  return (edge, from, to) => {
    const chosen = overrides.get(edge.id)
    if (chosen !== undefined) return chosen
    if (edge.from === edge.to) return false
    if (mode === 'frames') return crossesFrames(edge, nodes, grouping)
    if (mode === 'long') {
      const dx = from.x + from.width / 2 - (to.x + to.width / 2)
      const dy = from.y + from.height / 2 - (to.y + to.height / 2)
      return Math.hypot(dx, dy) > LONG_LINK
    }
    return false
  }
}
