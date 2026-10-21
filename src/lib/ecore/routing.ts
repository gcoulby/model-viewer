import type { GraphEdge, ParallelInfo } from '@/types/graph'
import type { EdgeRouting, LayoutDirection } from '@/types/view'
import { computeEdgePath, loopPath, type Box, type EdgePath, type Point } from './edgeGeometry'

export interface RouteInput {
  edge: GraphEdge
  parallel: ParallelInfo
}

/** Routes found by the layout and the boxes they were found for. */
export interface LaidOutRoutes {
  routes: Map<string, Point[]>
  boxes: Map<string, Box>
}

type Side = 'top' | 'bottom' | 'left' | 'right'

interface Plan {
  edge: GraphEdge
  parallel: ParallelInfo
  from: Box
  to: Box
  startSide: Side
  endSide: Side
}

interface Attach {
  key: string
  along: number
  pinned: boolean
  order: number
}

const MIN_GAP = 14
const BUS_OFFSET = 24
const PARALLEL_STEP = 10
const PORT_STEP = 16
const PORT_MARGIN = 10
const CORNER_RADIUS = 8
const MOVED_TOLERANCE = 0.5
/** Ends closer than this along one box side count as neighbours whose labels could collide. */
const LABEL_NEIGHBOUR = 60
const LABEL_STAGGER = 15

const NORMAL: Record<Side, Point> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const isVerticalSide = (side: Side) => side === 'top' || side === 'bottom'
const centreOf = (b: Box): Point => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 })
const round = (n: number) => Math.round(n * 10) / 10

function unit(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

function sameBox(a: Box, b: Box | undefined): boolean {
  return (
    !!b &&
    Math.abs(a.x - b.x) < MOVED_TOLERANCE &&
    Math.abs(a.y - b.y) < MOVED_TOLERANCE &&
    Math.abs(a.width - b.width) < MOVED_TOLERANCE &&
    Math.abs(a.height - b.height) < MOVED_TOLERANCE
  )
}

/** Which sides of the two boxes face each other, preferring the layout's main axis; null when they overlap. */
function chooseSides(a: Box, b: Box, vertical: boolean): [Side, Side] | null {
  const below = b.y - (a.y + a.height)
  const above = a.y - (b.y + b.height)
  const right = b.x - (a.x + a.width)
  const left = a.x - (b.x + b.width)
  const verticalGap = Math.max(below, above)
  const horizontalGap = Math.max(right, left)
  const canVertical = verticalGap >= MIN_GAP
  const canHorizontal = horizontalGap >= MIN_GAP
  const useVertical = canVertical && (vertical || !canHorizontal || verticalGap > horizontalGap * 3)
  const useHorizontal = canHorizontal && !useVertical
  if (useVertical) return below > above ? ['bottom', 'top'] : ['top', 'bottom']
  if (useHorizontal) return right > left ? ['right', 'left'] : ['left', 'right']
  return null
}

/** Spreads the edges meeting one side of a box along it, ordered by where their other ends lie. */
function distribute(box: Box, side: Side, attaches: Attach[], out: Map<string, Point>) {
  const horizontal = isVerticalSide(side)
  const length = horizontal ? box.width : box.height
  const centre = horizontal ? box.x + box.width / 2 : box.y + box.height / 2
  const fixed = side === 'top' ? box.y : side === 'bottom' ? box.y + box.height : side === 'left' ? box.x : box.x + box.width
  const at = (offset: number): Point => (horizontal ? { x: centre + offset, y: fixed } : { x: fixed, y: centre + offset })

  const free = attaches.filter((a) => !a.pinned).sort((a, b) => a.along - b.along || a.order - b.order)
  const pinned = attaches.filter((a) => a.pinned)
  const slots: (Attach | null)[] = [...free]
  if (pinned.length) {
    const along = pinned[0]?.along ?? centre
    const index = free.findIndex((a) => a.along > along)
    slots.splice(index < 0 ? free.length : index, 0, null)
  }
  const half = Math.max(0, length / 2 - PORT_MARGIN)
  const step = slots.length > 1 ? Math.min(PORT_STEP, (half * 2) / (slots.length - 1)) : 0
  const offsets = slots.map((_, i) => (i - (slots.length - 1) / 2) * step)
  const pinIndex = slots.indexOf(null)
  const shift = pinIndex >= 0 ? -(offsets[pinIndex] ?? 0) : 0
  slots.forEach((slot, i) => {
    if (slot) out.set(slot.key, at(Math.max(-half, Math.min(half, (offsets[i] ?? 0) + shift))))
  })
  for (const p of pinned) out.set(p.key, at(0))
}

/** A polyline with its corners rounded off. */
export function roundedPath(points: Point[], radius = CORNER_RADIUS): string {
  const first = points[0]
  if (!first) return ''
  let d = `M${round(first.x)} ${round(first.y)}`
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const p = points[i]
    const next = points[i + 1]
    if (!prev || !p || !next) continue
    const r = Math.min(radius, Math.hypot(p.x - prev.x, p.y - prev.y) / 2, Math.hypot(next.x - p.x, next.y - p.y) / 2)
    const inDir = unit(prev, p)
    const outDir = unit(p, next)
    if (r < 0.5 || Math.abs(inDir.x * outDir.y - inDir.y * outDir.x) < 0.01) {
      d += `L${round(p.x)} ${round(p.y)}`
      continue
    }
    d += `L${round(p.x - inDir.x * r)} ${round(p.y - inDir.y * r)}Q${round(p.x)} ${round(p.y)} ${round(p.x + outDir.x * r)} ${round(p.y + outDir.y * r)}`
  }
  const last = points.at(-1)
  if (last && points.length > 1) d += `L${round(last.x)} ${round(last.y)}`
  return d
}

/** A smooth curve through the points, straight into its last point so the arrowhead sits true. */
function smoothPath(points: Point[]): string {
  const first = points[0]
  if (!first) return ''
  let d = `M${round(first.x)} ${round(first.y)}`
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]
    const next = points[i + 1]
    if (!p || !next) continue
    d += `Q${round(p.x)} ${round(p.y)} ${round((p.x + next.x) / 2)} ${round((p.y + next.y) / 2)}`
  }
  const last = points.at(-1)
  if (last && points.length > 1) d += `L${round(last.x)} ${round(last.y)}`
  return d
}

function polylineEdgePath(points: Point[]): EdgePath {
  const start = points[0] ?? { x: 0, y: 0 }
  const end = points.at(-1) ?? start
  const second = points[1] ?? end
  const beforeLast = points.at(-2) ?? start
  const square = points.every((p, i) => {
    const prev = points[i - 1]
    return !prev || Math.abs(p.x - prev.x) < 0.5 || Math.abs(p.y - prev.y) < 0.5
  })
  return {
    d: square ? roundedPath(points) : smoothPath(points),
    start,
    end,
    startDirection: unit(start, second),
    endDirection: unit(beforeLast, end),
  }
}

function orthogonalPath(plan: Plan, start: Point, end: Point): EdgePath {
  const vertical = isVerticalSide(plan.startSide)
  const { index, count, flip } = plan.parallel
  const shift = (index - (count - 1) / 2) * flip * PARALLEL_STEP
  const bus = plan.edge.kind === 'inherit'
  const a = vertical ? start.y : start.x
  const b = vertical ? end.y : end.x
  const normal = NORMAL[plan.endSide]
  const gap = Math.abs(b - a)
  const trunk = bus ? b + (vertical ? normal.y : normal.x) * Math.min(BUS_OFFSET, gap / 2) : (a + b) / 2 + shift
  const aligned = vertical ? Math.abs(start.x - end.x) < 0.5 : Math.abs(start.y - end.y) < 0.5
  const points = aligned
    ? [start, end]
    : vertical
      ? [start, { x: start.x, y: trunk }, { x: end.x, y: trunk }, end]
      : [start, { x: trunk, y: start.y }, { x: trunk, y: end.y }, end]
  return {
    d: roundedPath(points),
    start,
    end,
    startDirection: NORMAL[plan.startSide],
    endDirection: { x: -normal.x, y: -normal.y },
  }
}

function curvedPath(plan: Plan, start: Point, end: Point): EdgePath {
  const ns = NORMAL[plan.startSide]
  const ne = NORMAL[plan.endSide]
  const span = isVerticalSide(plan.startSide) ? Math.abs(end.y - start.y) : Math.abs(end.x - start.x)
  const k = Math.max(30, Math.min(160, span / 2))
  const c1 = { x: start.x + ns.x * k, y: start.y + ns.y * k }
  const c2 = { x: end.x + ne.x * k, y: end.y + ne.y * k }
  return {
    d: `M${round(start.x)} ${round(start.y)}C${round(c1.x)} ${round(c1.y)},${round(c2.x)} ${round(c2.y)},${round(end.x)} ${round(end.y)}`,
    start,
    end,
    startDirection: ns,
    endDirection: { x: -ne.x, y: -ne.y },
  }
}

/** The box side a path end touches, or null when it ends inside the box. */
function sideAt(box: Box, p: Point): Side | null {
  const d: [Side, number][] = [
    ['top', Math.abs(p.y - box.y)],
    ['bottom', Math.abs(p.y - (box.y + box.height))],
    ['left', Math.abs(p.x - box.x)],
    ['right', Math.abs(p.x - (box.x + box.width))],
  ]
  d.sort((a, b) => a[1] - b[1])
  const best = d[0]
  return best && best[1] < 2 ? best[0] : null
}

/**
 * Sends each end label to the side of its line away from the box centre, and staggers labels of ends
 * that sit close together on one side, so neighbouring links do not print over each other.
 */
function hintLabels(paths: Map<string, EdgePath>, edges: RouteInput[], boxes: Map<string, Box>) {
  const sides = new Map<string, { along: number; path: EdgePath; end: 'start' | 'end'; centre: Point; point: Point }[]>()
  for (const { edge } of edges) {
    const path = paths.get(edge.id)
    if (!path || edge.kind === 'inherit' || edge.from === edge.to) continue
    for (const [end, nodeId, point] of [
      ['start', edge.from, path.start],
      ['end', edge.to, path.end],
    ] as const) {
      const box = boxes.get(nodeId)
      const side = box && sideAt(box, point)
      if (!box || !side) continue
      const key = `${nodeId}|${side}`
      const list = sides.get(key) ?? []
      list.push({ along: isVerticalSide(side) ? point.x : point.y, path, end, centre: centreOf(box), point })
      sides.set(key, list)
    }
  }
  for (const list of sides.values()) {
    list.sort((a, b) => a.along - b.along)
    list.forEach((item, i) => {
      const prev = list[i - 1]
      const crowded = !!prev && item.along - prev.along < LABEL_NEIGHBOUR
      const hint = {
        away: { x: item.point.x - item.centre.x, y: item.point.y - item.centre.y },
        stagger: crowded && i % 2 === 1 ? LABEL_STAGGER : 0,
      }
      if (item.end === 'start') item.path.startLabel = hint
      else item.path.endLabel = hint
    })
  }
}

/**
 * Paths for every edge whose two boxes are known. `routed` uses the layout's own route while both boxes
 * are where the layout put them and otherwise draws square; square and curved links leave from the box
 * sides that face each other, spread along each side, with every subtype meeting its supertype at one point.
 */
export function routeEdges(
  boxes: Map<string, Box>,
  edges: RouteInput[],
  routing: EdgeRouting,
  direction: LayoutDirection,
  laidOut?: LaidOutRoutes,
): Map<string, EdgePath> {
  const paths = new Map<string, EdgePath>()
  const plans: Plan[] = []
  const vertical = direction === 'TB' || direction === 'BT'

  for (const { edge, parallel } of edges) {
    const from = boxes.get(edge.from)
    const to = boxes.get(edge.to)
    if (!from || !to) continue
    if (edge.from === edge.to) {
      paths.set(edge.id, loopPath(from, parallel.index))
      continue
    }
    if (routing === 'straight') {
      paths.set(edge.id, computeEdgePath(from, to, parallel, false))
      continue
    }
    if (routing === 'routed' && laidOut) {
      const route = laidOut.routes.get(edge.id)
      if (route && sameBox(from, laidOut.boxes.get(edge.from)) && sameBox(to, laidOut.boxes.get(edge.to))) {
        paths.set(edge.id, polylineEdgePath(route))
        continue
      }
    }
    const sides = chooseSides(from, to, vertical)
    if (!sides) {
      paths.set(edge.id, computeEdgePath(from, to, parallel, false))
      continue
    }
    plans.push({ edge, parallel, from, to, startSide: sides[0], endSide: sides[1] })
  }

  const groups = new Map<string, { box: Box; side: Side; attaches: Attach[] }>()
  const attach = (nodeId: string, box: Box, side: Side, a: Attach) => {
    const key = `${nodeId}|${side}`
    const group = groups.get(key)
    if (group) group.attaches.push(a)
    else groups.set(key, { box, side, attaches: [a] })
  }
  plans.forEach((plan, order) => {
    const { edge, from, to, startSide, endSide } = plan
    const toCentre = centreOf(to)
    const fromCentre = centreOf(from)
    attach(edge.from, from, startSide, {
      key: `${edge.id}|start`,
      along: isVerticalSide(startSide) ? toCentre.x : toCentre.y,
      pinned: false,
      order,
    })
    attach(edge.to, to, endSide, {
      key: `${edge.id}|end`,
      along: isVerticalSide(endSide) ? fromCentre.x : fromCentre.y,
      pinned: edge.kind === 'inherit',
      order,
    })
  })
  const ports = new Map<string, Point>()
  for (const { box, side, attaches } of groups.values()) distribute(box, side, attaches, ports)

  for (const plan of plans) {
    const start = ports.get(`${plan.edge.id}|start`)
    const end = ports.get(`${plan.edge.id}|end`)
    if (!start || !end) continue
    paths.set(plan.edge.id, routing === 'curved' ? curvedPath(plan, start, end) : orthogonalPath(plan, start, end))
  }
  if (routing !== 'straight') hintLabels(paths, edges, boxes)
  return paths
}
