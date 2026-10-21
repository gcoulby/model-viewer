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
  /** Halfway along the path, for a label that belongs to the whole link. */
  mid: Point
  /** Set when the link is drawn as two short stubs ending in tags instead of one line. */
  ports?: { start: PortTag; end: PortTag }
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
  anchor: 'start' | 'end' | 'middle'
}

/** Where a ported link's tag sits: the tip of its stub, and the way the stub leaves the box. */
export interface PortTag {
  at: Point
  direction: Point
}

const PARALLEL_SPACING = 64
const LOOP_BASE = 50
const LOOP_STEP = 28
const LABEL_SIDE_OFFSET = 11

const round = (n: number) => Math.round(n * 10) / 10

export function quadAt(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }
}

export function cubicAt(a: Point, c1: Point, c2: Point, b: Point, t: number): Point {
  const u = 1 - t
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t] as const
  return {
    x: w[0] * a.x + w[1] * c1.x + w[2] * c2.x + w[3] * b.x,
    y: w[0] * a.y + w[1] * c1.y + w[2] * c2.y + w[3] * b.y,
  }
}

/** The point halfway along a polyline, by length. */
export function polylineMid(points: Point[]): Point {
  const first = points[0] ?? { x: 0, y: 0 }
  let total = 0
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y)
  let left = total / 2
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!
    const b = points[i]!
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    if (length >= left && length > 0) return { x: a.x + ((b.x - a.x) * left) / length, y: a.y + ((b.y - a.y) * left) / length }
    left -= length
  }
  return points.at(-1) ?? first
}

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
    mid: cubicAt({ x: startX, y: box.y }, { x: startX, y: box.y - extent }, { x: right + extent, y: endY }, { x: right, y: endY }, 0.5),
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
  const mid = curved ? quadAt(start, control, end, 0.5) : { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
  return { d, start, end, startDirection, endDirection, mid }
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
