import type { ELK, ElkExtendedEdge, ElkNode, LayoutOptions } from 'elkjs/lib/elk-api'
import { spacingFactor } from '@/data/layoutOptions'
import type { DrawnEdge, DrawnNode } from '@/types/graph'
import type { LayoutDirection, LayoutSettings, NodeGeometry } from '@/types/view'
import type { Point } from './edgeGeometry'
import { EXTERNAL_GROUP, GROUP_LABEL_HEIGHT, GROUP_PADDING, groupKeyOf, groupingActive } from './groups'
import { comparePackages, type LayoutResult } from './layout'
import { layoutEdges } from './shaping'

const ELK_DIRECTION: Record<LayoutDirection, string> = { TB: 'DOWN', BT: 'UP', LR: 'RIGHT', RL: 'LEFT' }
/** The side of a supertype its subtypes hang from. */
const SUBTYPE_SIDE: Record<LayoutDirection, string> = { TB: 'SOUTH', BT: 'NORTH', LR: 'EAST', RL: 'WEST' }

const GROUP_PREFIX = 'group:'
const SUBTYPES_PORT = '::subtypes'
const COMPONENT_ASPECT = '1.6'
const FRAME_GAP = 70

type ElkAlgorithm = Exclude<LayoutSettings['algorithm'], 'dagre'>

function algorithmOptions(algorithm: ElkAlgorithm, settings: LayoutSettings): LayoutOptions {
  const f = spacingFactor(settings.spacing)
  const px = (n: number) => String(Math.round(n * f))
  const direction = ELK_DIRECTION[settings.direction]
  switch (algorithm) {
    case 'layered':
      return {
        'elk.algorithm': 'layered',
        'elk.direction': direction,
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.spacing.nodeNode': px(40),
        'elk.layered.spacing.nodeNodeBetweenLayers': px(72),
        'elk.spacing.edgeNode': px(18),
        'elk.spacing.edgeEdge': px(10),
        'elk.layered.spacing.edgeNodeBetweenLayers': px(18),
        'elk.layered.spacing.edgeEdgeBetweenLayers': px(10),
        'elk.spacing.componentComponent': px(60),
        'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
        'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
        'elk.layered.thoroughness': '10',
        'elk.aspectRatio': COMPONENT_ASPECT,
      }
    case 'tree':
      return {
        'elk.algorithm': 'mrtree',
        'elk.direction': direction,
        'elk.spacing.nodeNode': px(36),
        'elk.mrtree.edgeRoutingMode': 'AVOID_OVERLAP',
        'elk.mrtree.searchOrder': 'DFS',
        'elk.spacing.componentComponent': px(60),
        'elk.aspectRatio': COMPONENT_ASPECT,
      }
    case 'stress':
      return {
        'elk.algorithm': 'stress',
        'elk.stress.desiredEdgeLength': px(220),
        'elk.spacing.nodeNode': px(48),
      }
    case 'force':
      return {
        'elk.algorithm': 'force',
        'elk.force.model': 'EADES',
        'elk.force.repulsion': '1',
        'elk.force.iterations': '400',
        'elk.spacing.nodeNode': px(20),
        'elk.spacing.componentComponent': px(60),
        'elk.aspectRatio': COMPONENT_ASPECT,
      }
    case 'radial':
      return {
        'elk.algorithm': 'radial',
        'elk.spacing.nodeNode': px(40),
        'elk.radial.compactor': 'WEDGE_COMPACTION',
        'elk.radial.compactionStepSize': '1',
      }
    case 'grid':
      return {
        'elk.algorithm': 'rectpacking',
        'elk.spacing.nodeNode': px(34),
        'elk.aspectRatio': COMPONENT_ASPECT,
        'elk.rectpacking.trybox': 'false',
      }
  }
}

/** These place boxes without regard to their size, so a second pass pushes overlapping boxes apart. */
const mayOverlap = (algorithm: ElkAlgorithm) => algorithm === 'stress' || algorithm === 'radial' || algorithm === 'force'

/** Only the layered layout routes links around boxes; other routes are dropped. */
const routesEdges = (algorithm: ElkAlgorithm) => algorithm === 'layered'

const elkAlgorithmOf = (settings: LayoutSettings): ElkAlgorithm =>
  settings.algorithm === 'dagre' ? 'layered' : settings.algorithm

interface Members {
  nodes: DrawnNode[]
  edges: DrawnEdge[]
}

/** ELK node and edge builders sharing one set of supertype ports. */
function elkBuilders(members: Members, geometry: Map<string, NodeGeometry>, settings: LayoutSettings) {
  const algorithm = elkAlgorithmOf(settings)
  // A supertype gets one port for all its subtypes, so ELK draws them as one line that branches.
  const ports = new Set<string>()
  if (routesEdges(algorithm)) for (const e of members.edges) if (e.kind === 'inherit') ports.add(e.to + SUBTYPES_PORT)

  const node = (n: DrawnNode): ElkNode => {
    const geo = geometry.get(n.id)
    const port = n.id + SUBTYPES_PORT
    const elkNode: ElkNode = { id: n.id, width: geo?.width ?? 0, height: geo?.height ?? 0 }
    if (ports.has(port)) {
      elkNode.ports = [
        { id: port, width: 0, height: 0, layoutOptions: { 'elk.port.side': SUBTYPE_SIDE[settings.direction] } },
      ]
      elkNode.layoutOptions = { 'elk.portConstraints': 'FIXED_SIDE' }
    }
    return elkNode
  }
  // Supertypes come first, so subtypes rank below them.
  const edge = (e: DrawnEdge): ElkExtendedEdge => {
    if (e.kind !== 'inherit') return { id: e.id, sources: [e.from], targets: [e.to] }
    const port = e.to + SUBTYPES_PORT
    return { id: e.id, sources: [ports.has(port) ? port : e.to], targets: [e.from] }
  }
  return { node, edge }
}

function sectionPoints(edge: ElkExtendedEdge): Point[] | null {
  const points: Point[] = []
  for (const s of edge.sections ?? []) {
    for (const p of [s.startPoint, ...(s.bendPoints ?? []), s.endPoint]) {
      const last = points.at(-1)
      if (!last || Math.abs(last.x - p.x) > 0.01 || Math.abs(last.y - p.y) > 0.01) points.push({ x: p.x, y: p.y })
    }
  }
  return points.length > 1 && points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)) ? points : null
}

/** Reads node positions and, unless told not to, edge routes back out of a laid-out ELK graph. */
function readResult(laidOut: ElkNode, edges: DrawnEdge[], withRoutes: boolean): LayoutResult {
  const positions = new Map<string, Point>()
  const routes = new Map<string, Point[]>()
  const byId = new Map(edges.map((e) => [e.id, e]))

  const visit = (node: ElkNode, ox: number, oy: number) => {
    for (const child of node.children ?? []) {
      const x = ox + (child.x ?? 0)
      const y = oy + (child.y ?? 0)
      if (child.id.startsWith(GROUP_PREFIX)) visit(child, x, y)
      else if (Number.isFinite(x) && Number.isFinite(y)) positions.set(child.id, { x, y })
    }
    if (!withRoutes) return
    for (const e of node.edges ?? []) {
      const edge = byId.get(e.id)
      const points = edge && sectionPoints(e)
      if (edge && points) routes.set(e.id, edge.kind === 'inherit' ? points.reverse() : points)
    }
  }
  visit(laidOut, 0, 0)
  return { positions, routes }
}

/** Pushes overlapping boxes apart while keeping the layout's overall shape. */
async function removeOverlaps(
  elk: ELK,
  nodes: DrawnNode[],
  geometry: Map<string, NodeGeometry>,
  positions: Map<string, Point>,
  settings: LayoutSettings,
): Promise<Map<string, Point>> {
  const gap = String(Math.round(32 * spacingFactor(settings.spacing)))
  const laidOut = await elk.layout({
    id: 'root',
    layoutOptions: { 'elk.algorithm': 'sporeOverlap', 'elk.spacing.nodeNode': gap, 'elk.overlapRemoval.maxIterations': '200' },
    children: nodes.map((n) => {
      const geo = geometry.get(n.id)
      const p = positions.get(n.id)
      return { id: n.id, x: p?.x ?? 0, y: p?.y ?? 0, width: geo?.width ?? 0, height: geo?.height ?? 0 }
    }),
  })
  return readResult(laidOut, [], false).positions
}

/** One ELK run over a set of nodes with no frames. */
async function layoutFlat(
  elk: ELK,
  members: Members,
  geometry: Map<string, NodeGeometry>,
  settings: LayoutSettings,
): Promise<LayoutResult> {
  const algorithm = elkAlgorithmOf(settings)
  const build = elkBuilders(members, geometry, settings)
  const laidOut = await elk.layout({
    id: 'root',
    layoutOptions: {
      ...algorithmOptions(algorithm, settings),
      ...(algorithm === 'layered' ? { 'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES' } : {}),
    },
    children: members.nodes.map(build.node),
    edges: members.edges.map(build.edge),
  })
  const result = readResult(laidOut, members.edges, routesEdges(algorithm))
  if (!mayOverlap(algorithm)) return result
  return { positions: await removeOverlaps(elk, members.nodes, geometry, result.positions, settings), routes: new Map() }
}

/** The layered layout with frames: one ELK run that also weighs the links between frames. */
async function layoutLayeredFrames(
  elk: ELK,
  members: Members,
  frames: Map<string, DrawnNode[]>,
  geometry: Map<string, NodeGeometry>,
  settings: LayoutSettings,
): Promise<LayoutResult> {
  const build = elkBuilders(members, geometry, settings)
  const options = algorithmOptions('layered', settings)
  const laidOut = await elk.layout({
    id: 'root',
    layoutOptions: { ...options, 'elk.hierarchyHandling': 'INCLUDE_CHILDREN', 'elk.json.edgeCoords': 'ROOT' },
    children: [...frames].map(([key, nodes]) => ({
      id: GROUP_PREFIX + key,
      layoutOptions: { ...options, 'elk.padding': framePadding() },
      children: nodes.map(build.node),
    })),
    edges: members.edges.map(build.edge),
  })
  return readResult(laidOut, members.edges, true)
}

function framePadding(): string {
  return `[top=${GROUP_PADDING + GROUP_LABEL_HEIGHT},left=${GROUP_PADDING},bottom=${GROUP_PADDING},right=${GROUP_PADDING}]`
}

/**
 * Every other algorithm with frames: each frame is laid out on its own, then the finished frames are
 * arranged as fixed boxes, in layers by the links between them (or packed, for the grid).
 */
async function layoutFramesApart(
  elk: ELK,
  members: Members,
  frames: Map<string, DrawnNode[]>,
  geometry: Map<string, NodeGeometry>,
  settings: LayoutSettings,
): Promise<LayoutResult> {
  const groupOf = new Map<string, string>()
  for (const [key, nodes] of frames) for (const n of nodes) groupOf.set(n.id, key)

  const inner = await Promise.all(
    [...frames].map(async ([key, nodes]) => {
      const edges = members.edges.filter((e) => groupOf.get(e.from) === key && groupOf.get(e.to) === key)
      const result = await layoutFlat(elk, { nodes, edges }, geometry, settings)
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const n of nodes) {
        const p = result.positions.get(n.id)
        const geo = geometry.get(n.id)
        if (!p || !geo) continue
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x + geo.width)
        maxY = Math.max(maxY, p.y + geo.height)
      }
      return { key, result, minX, minY, width: maxX - minX, height: maxY - minY }
    }),
  )

  const between = new Map<string, ElkExtendedEdge>()
  if (settings.algorithm !== 'grid') {
    for (const e of members.edges) {
      const a = groupOf.get(e.from)
      const b = groupOf.get(e.to)
      if (!a || !b || a === b) continue
      const [source, target] = e.kind === 'inherit' ? [b, a] : [a, b]
      const id = `${source}\n${target}`
      if (!between.has(id)) between.set(id, { id, sources: [GROUP_PREFIX + source], targets: [GROUP_PREFIX + target] })
    }
  }
  const arrangement = settings.algorithm === 'grid' ? 'grid' : 'layered'
  const laidOut = await elk.layout({
    id: 'root',
    layoutOptions: {
      ...algorithmOptions(arrangement, settings),
      'elk.spacing.nodeNode': String(Math.round(FRAME_GAP * spacingFactor(settings.spacing))),
    },
    children: inner.map((f) => ({
      id: GROUP_PREFIX + f.key,
      width: f.width + GROUP_PADDING * 2,
      height: f.height + GROUP_PADDING * 2 + GROUP_LABEL_HEIGHT,
    })),
    edges: [...between.values()],
  })

  const positions = new Map<string, Point>()
  const routes = new Map<string, Point[]>()
  for (const f of inner) {
    const frame = laidOut.children?.find((c) => c.id === GROUP_PREFIX + f.key)
    const dx = (frame?.x ?? 0) + GROUP_PADDING - f.minX
    const dy = (frame?.y ?? 0) + GROUP_PADDING + GROUP_LABEL_HEIGHT - f.minY
    f.result.positions.forEach((p, id) => positions.set(id, { x: p.x + dx, y: p.y + dy }))
    f.result.routes.forEach((points, id) => routes.set(id, points.map((p) => ({ x: p.x + dx, y: p.y + dy }))))
  }
  return { positions, routes }
}

/** Lays out with ELK. Rejects if ELK fails or leaves any box unplaced. */
export async function layoutWithElk(
  elk: ELK,
  nodes: DrawnNode[],
  edges: DrawnEdge[],
  geometry: Map<string, NodeGeometry>,
  settings: LayoutSettings,
): Promise<LayoutResult> {
  const members: Members = {
    nodes: [...nodes].sort(comparePackages),
    edges: layoutEdges(nodes, edges, settings).filter((e) => e.from !== e.to),
  }
  let result: LayoutResult
  if (!groupingActive(nodes, settings.grouping)) {
    result = await layoutFlat(elk, members, geometry, settings)
  } else {
    const frames = new Map<string, DrawnNode[]>()
    for (const n of members.nodes) {
      const key = groupKeyOf(n, settings.grouping) ?? ''
      const list = frames.get(key)
      if (list) list.push(n)
      else frames.set(key, [n])
    }
    const external = frames.get(EXTERNAL_GROUP)
    if (external) {
      frames.delete(EXTERNAL_GROUP)
      frames.set(EXTERNAL_GROUP, external)
    }
    result =
      elkAlgorithmOf(settings) === 'layered'
        ? await layoutLayeredFrames(elk, members, frames, geometry, settings)
        : await layoutFramesApart(elk, members, frames, geometry, settings)
  }
  if (nodes.some((n) => !result.positions.has(n.id))) throw new Error('the layout did not place every box')
  return result
}
