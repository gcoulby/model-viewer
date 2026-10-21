import type { DrawnEdge } from '@/types/graph'
import type { LayoutDirection, NodeGeometry } from '@/types/view'
import type { Position } from './layout'
import { PORT_TAG_HEIGHT, portTagLength } from './portTag'

export type PortSide = 'top' | 'bottom' | 'left' | 'right'

export interface Margins {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * Where tags go when the layout makes room for them: as on a schematic, links leave from one side and
 * arrive on the opposite one, across the layout's main axis so they stay clear of the links it routes.
 */
export interface PortRoom {
  outSide: PortSide
  inSide: PortSide
  /** The space kept clear around each box for its tags. */
  margins: ReadonlyMap<string, Margins>
  /** The links the room was made for. */
  ported: ReadonlySet<string>
}

/** Tags sit this far apart along a box side, and spread past its ends when there are too many to fit. */
export const ROOM_PORT_STEP = 20
export const ROOM_STUB_LENGTH = 14
/** Extra stub length for a tag that has spread past the end of its side, room for the bend. */
export const ROOM_BEND = 12
/** Clear space between a tag and whatever is placed next to it. */
const ROOM_GAP = 10
/** Keeps the outermost tag clear of the box corner. */
export const ROOM_SIDE_MARGIN = 10

export function roomSides(direction: LayoutDirection): { outSide: PortSide; inSide: PortSide } {
  return direction === 'TB' || direction === 'BT'
    ? { outSide: 'right', inSide: 'left' }
    : { outSide: 'bottom', inSide: 'top' }
}

const isAcross = (side: PortSide) => side === 'top' || side === 'bottom'

/** How far each tag on a side sits from the side's centre, in the order given. */
export function roomOffsets(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * ROOM_PORT_STEP)
}

/** The space each box needs around it for the tags of the given links. */
export function portMargins(
  edges: DrawnEdge[],
  ported: ReadonlySet<string>,
  geometry: ReadonlyMap<string, NodeGeometry>,
  direction: LayoutDirection,
  textsOf: (edge: DrawnEdge) => { start: string; end: string },
): PortRoom {
  const { outSide, inSide } = roomSides(direction)
  const sides = new Map<string, { count: number; longest: number }>()
  const add = (nodeId: string, side: PortSide, text: string) => {
    const key = `${nodeId}|${side}`
    const entry = sides.get(key) ?? { count: 0, longest: 0 }
    entry.count += 1
    entry.longest = Math.max(entry.longest, portTagLength(text))
    sides.set(key, entry)
  }
  for (const edge of edges) {
    if (!ported.has(edge.id) || edge.from === edge.to) continue
    const texts = textsOf(edge)
    add(edge.from, outSide, texts.start)
    add(edge.to, inSide, texts.end)
  }

  const margins = new Map<string, Margins>()
  for (const [key, { count, longest }] of sides) {
    const split = key.lastIndexOf('|')
    const nodeId = key.slice(0, split)
    const side = key.slice(split + 1) as PortSide
    const geo = geometry.get(nodeId)
    if (!geo) continue
    const m = margins.get(nodeId) ?? { top: 0, right: 0, bottom: 0, left: 0 }
    const length = isAcross(side) ? geo.width : geo.height
    const reach = (Math.max(0, count - 1) / 2) * ROOM_PORT_STEP + PORT_TAG_HEIGHT / 2 + ROOM_GAP
    const spill = Math.max(0, reach - (length / 2 - ROOM_SIDE_MARGIN))
    const bend = spill > 0 ? ROOM_BEND : 0
    m[side] = Math.max(m[side], ROOM_STUB_LENGTH + bend + longest + ROOM_GAP)
    if (isAcross(side)) {
      m.left = Math.max(m.left, spill)
      m.right = Math.max(m.right, spill)
    } else {
      m.top = Math.max(m.top, spill)
      m.bottom = Math.max(m.bottom, spill)
    }
    margins.set(nodeId, m)
  }
  return { outSide, inSide, margins, ported }
}

/** Each box grown by its margins, for the layout engines to place. */
export function inflateGeometry(
  geometry: ReadonlyMap<string, NodeGeometry>,
  margins: ReadonlyMap<string, Margins>,
): Map<string, NodeGeometry> {
  const grown = new Map<string, NodeGeometry>()
  geometry.forEach((geo, id) => {
    const m = margins.get(id)
    grown.set(id, m ? { ...geo, width: geo.width + m.left + m.right, height: geo.height + m.top + m.bottom } : geo)
  })
  return grown
}

/** Moves each laid-out position from the grown box's corner back to the box's own. */
export function deflatePositions(
  positions: ReadonlyMap<string, Position>,
  margins: ReadonlyMap<string, Margins>,
): Map<string, Position> {
  const moved = new Map<string, Position>()
  positions.forEach((p, id) => {
    const m = margins.get(id)
    moved.set(id, m ? { x: p.x + m.left, y: p.y + m.top } : p)
  })
  return moved
}
