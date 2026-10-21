import type { DrawnEdge } from '@/types/graph'
import type { PortTag } from './edgeGeometry'
import { dependencyCount } from './edgeStyle'

export const PORT_FONT_SIZE = 10.5
export const PORT_TAG_HEIGHT = 16
const HEIGHT = PORT_TAG_HEIGHT
const POINT = 6
const PADDING = 7
/** IBM Plex Mono advances 0.6em per character, so the tag width needs no measuring. */
const CHAR_WIDTH = PORT_FONT_SIZE * 0.6

/** How far a tag reaches out from the tip of its stub. */
export function portTagLength(text: string): number {
  return text.length * CHAR_WIDTH + PADDING * 2 + POINT
}

export interface PortTagShape {
  /** Places the tag's own frame, whose x axis runs out along the stub. */
  transform: string
  points: string
  textX: number
  anchor: 'middle'
}

/**
 * An EDA-style net tag at the tip of a stub, pointing away from the box at the source end and towards it
 * at the target end. Tags on the top and bottom of a box are turned upright, so they never overlap their
 * neighbours; text always reads left to right or bottom to top.
 */
export function portTagShape(tag: PortTag, text: string, outgoing: boolean): PortTagShape {
  const vertical = Math.abs(tag.direction.y) > Math.abs(tag.direction.x)
  const sign = vertical ? -Math.sign(tag.direction.y) || 1 : Math.sign(tag.direction.x) || 1
  const width = portTagLength(text)
  const h = HEIGHT / 2
  // Drawn along +x, then mirrored by `sign` so the tag always extends away from the box.
  const local = outgoing
    ? [[0, -h], [width - POINT, -h], [width, 0], [width - POINT, h], [0, h]]
    : [[0, 0], [POINT, -h], [width, -h], [width, h], [POINT, h]]
  const points = local.map(([x = 0, y = 0]) => `${Math.round(x * sign * 10) / 10},${y}`).join(' ')
  const textX = sign * (outgoing ? (width - POINT) / 2 : (width + POINT) / 2)
  const x = Math.round(tag.at.x * 10) / 10
  const y = Math.round(tag.at.y * 10) / 10
  return {
    transform: `translate(${x} ${y})${vertical ? ' rotate(-90)' : ''}`,
    points,
    textX: Math.round(textX * 10) / 10,
    anchor: 'middle',
  }
}

/** What each tag says: the far end, and the feature that makes the link. */
export function portTagTexts(edge: DrawnEdge, nameOf: (id: string) => string): { start: string; end: string } {
  const from = nameOf(edge.from)
  const to = nameOf(edge.to)
  switch (edge.kind) {
    case 'dependency':
      return { start: `${to} (${dependencyCount(edge)})`, end: `${from} (${dependencyCount(edge)})` }
    case 'inherit':
      return { start: `extends ${to}`, end: from }
    case 'enumLink':
      return { start: `${edge.forward.feature.name}: ${to}`, end: `${from}.${edge.forward.feature.name}` }
    case 'containment':
    case 'reference':
      return { start: `${edge.forward.feature.name} → ${to}`, end: `${from}.${edge.forward.feature.name}` }
  }
}
