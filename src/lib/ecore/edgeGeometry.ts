import type { ParallelInfo } from '@/types/graph'

export interface Point {
  x: number
  y: number
}

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export interface EdgePath {
  d: string
  start: Point
  end: Point
  /** Unit direction of the path leaving the start point. */
  startDirection: Point
  /** Unit direction of the path arriving at the end point. */
  endDirection: Point
  /** Where the label at each end goes, so labels of neighbouring links on one box side do not collide. */
  startLabel?: LabelHint
  endLabel?: LabelHint
}

export interface LabelHint {
  /** Points from the box centre towards this end; the label goes on that side of the line. */
  away: Point
  /** Extra distance along the line, to stagger labels of close neighbours. */
  stagger: number
}

export interface LabelPlacement extends Point {
  anchor: 'start' | 'end'
}

const PARALLEL_SPACING = 64
const LOOP_BASE = 50
const LOOP_STEP = 28
const LABEL_SIDE_OFFSET = 11

const round = (n: number) => Math.round(n * 10) / 10

function normalise(v: Point): Point {
  const length = Math.hypot(v.x, v.y) || 1
  return { x: v.x / length, y: v.y / length }
}

function perpendicular(t: Point): Point {
  let p = { x: -t.y, y: t.x }
  if (p.y > 0.01 || (Math.abs(p.y) <= 0.01 && p.x < 0)) p = { x: -p.x, y: -p.y }
  return p
}

/** Where the line from the box centre towards `target` crosses the box outline. */
function boundaryPoint(box: Box, target: Point): Point {
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  const dx = target.x - cx
  const dy = target.y - cy
  if (!dx && !dy) return { x: cx, y: cy }
  const k = Math.min(
    dx ? box.width / 2 / Math.abs(dx) : Infinity,
    dy ? box.height / 2 / Math.abs(dy) : Infinity,
  )
  return { x: cx + dx * k, y: cy + dy * k }
}

export function loopPath(box: Box, index: number): EdgePath {
  const extent = LOOP_BASE + index * LOOP_STEP
  const startX = Math.max(box.x + 10, box.x + box.width - 36)
  const endY = box.y + Math.min(26, box.height - 8)
  const right = box.x + box.width
  return {
    d: `M${round(startX)} ${round(box.y)}C${round(startX)} ${round(box.y - extent)},${round(right + extent)} ${round(endY)},${round(right)} ${round(endY)}`,
    start: { x: startX, y: box.y },
    end: { x: right, y: endY },
    startDirection: { x: 0, y: -1 },
    endDirection: { x: -1, y: 0 },
  }
}

/** Straight, curved or looping path between two node boxes, with floating end points. */
export function computeEdgePath(from: Box, to: Box, parallel: ParallelInfo, isLoop: boolean): EdgePath {
  if (isLoop) return loopPath(from, parallel.index)

  const ax = from.x + from.width / 2
  const ay = from.y + from.height / 2
  const bx = to.x + to.width / 2
  const by = to.y + to.height / 2
  const dx = bx - ax
  const dy = by - ay
  const length = Math.hypot(dx, dy) || 1
  const offset = (parallel.index - (parallel.count - 1) / 2) * parallel.flip * PARALLEL_SPACING
  const curved = Math.abs(offset) > 0.01
  const control = {
    x: (ax + bx) / 2 + (-dy / length) * offset * 2,
    y: (ay + by) / 2 + (dx / length) * offset * 2,
  }

  const start = boundaryPoint(from, curved ? control : { x: bx, y: by })
  const end = boundaryPoint(to, curved ? control : { x: ax, y: ay })
  const straight = normalise({ x: end.x - start.x, y: end.y - start.y })
  const startDirection = curved ? normalise({ x: control.x - start.x, y: control.y - start.y }) : straight
  const endDirection = curved ? normalise({ x: end.x - control.x, y: end.y - control.y }) : straight
  const d = curved
    ? `M${round(start.x)} ${round(start.y)}Q${round(control.x)} ${round(control.y)} ${round(end.x)} ${round(end.y)}`
    : `M${round(start.x)} ${round(start.y)}L${round(end.x)} ${round(end.y)}`
  return { d, start, end, startDirection, endDirection }
}

/** Label position beside `point`, pushed `offset` along `direction` and off to the side of the line. */
export function placeLabel(point: Point, direction: Point, offset: number, hint?: LabelHint): LabelPlacement {
  let side = perpendicular(direction)
  if (hint && side.x * hint.away.x + side.y * hint.away.y < 0) side = { x: -side.x, y: -side.y }
  offset += hint?.stagger ?? 0
  const x = point.x + direction.x * offset + side.x * LABEL_SIDE_OFFSET
  const y = point.y + direction.y * offset + side.y * LABEL_SIDE_OFFSET
  return { x: round(x), y: round(y), anchor: x >= point.x ? 'start' : 'end' }
}
