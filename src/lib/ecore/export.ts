import type { DrawnEdge, DrawnNode, ParallelInfo } from '@/types/graph'
import type { EdgeRouting, LayoutDirection, LayoutGrouping, NodeGeometry } from '@/types/view'
import type { Box, EdgePath } from './edgeGeometry'
import { edgeLabels, edgeStyleFor, type EdgeTone, type MarkerKind } from './edgeStyle'
import { ROW_HEIGHT } from './measure'
import { computeGroupBoxes, type GroupBox } from './groups'
import { groupPaint, paintForNode, type HueFor } from './paint'
import { PORT_FONT_SIZE, portTagShape, portTagTexts } from './portTag'
import { routeEdges, type LaidOutRoutes } from './routing'

export interface ExportNode {
  node: DrawnNode
  geometry: NodeGeometry
  x: number
  y: number
}

export interface ExportEdge {
  edge: DrawnEdge
  parallel: ParallelInfo
}

export interface ExportColors {
  background: string
  node: string
  ink: string
  muted: string
  edge: string
  halo: string
  /** Colour of a two-way dependency between collapsed packages. */
  cycle: string
  /** Outline colour for `focusId`; falls back to the node's own stroke. */
  selection?: string
}

export interface ExportInput {
  nodes: ExportNode[]
  edges: ExportEdge[]
  dark: boolean
  hueFor: HueFor
  colors: ExportColors
  /** Node drawn with a heavier outline. */
  focusId?: string
  /** Adds `data-node-id` to each node so a host page can make them clickable. */
  nodeIds?: boolean
  /** Sizes the SVG to its container (width 100%) instead of fixed pixels. */
  fluid?: boolean
  /** Frames drawn behind the nodes; defaults to one per file. */
  grouping?: LayoutGrouping
  routing?: EdgeRouting
  direction?: LayoutDirection
  /** The layout's own routes, used by `routed` while both ends of an edge are where the layout put them. */
  laidOut?: LaidOutRoutes
  /** Draws the feature names at the ends of links; on by default. */
  labels?: boolean
  /** Links drawn as a pair of port tags instead of a line. */
  isPorted?: (edge: DrawnEdge, from: Box, to: Box) => boolean
}

export interface DiagramSvg {
  text: string
  width: number
  height: number
}

const PADDING = 32
const CORNER = 6
const FONT_UI = "'IBM Plex Sans', system-ui, sans-serif"
const FONT_MONO = "'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace"

const round = (n: number) => Math.round(n * 10) / 10

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function markerDefs(c: ExportColors): string {
  return `<defs>
<marker id="m-triangle" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1.5L11 6L1 10.5z" fill="${c.node}" stroke="${c.edge}" stroke-width="1.3" stroke-linejoin="round"/></marker>
<marker id="m-diamond" viewBox="0 0 16 10" refX="0.5" refY="5" markerWidth="16" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path d="M.5 5L8 .8L15.5 5L8 9.2z" fill="${c.edge}" stroke="${c.edge}" stroke-width="1" stroke-linejoin="round"/></marker>
<marker id="m-arrow" viewBox="0 0 11 10" refX="10" refY="5" markerWidth="11" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1L10 5L1 9" fill="none" stroke="${c.edge}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></marker>
<marker id="m-arrowMuted" viewBox="0 0 11 10" refX="10" refY="5" markerWidth="11" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1L10 5L1 9" fill="none" stroke="${c.muted}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></marker>
<marker id="m-arrowCycle" viewBox="0 0 11 10" refX="10" refY="5" markerWidth="11" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1L10 5L1 9" fill="none" stroke="${c.cycle}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></marker>
</defs>`
}

const markerRef = (kind: MarkerKind) => `url(#m-${kind})`

function portTagSvg(path: EdgePath, edge: DrawnEdge, nameOf: (id: string) => string, c: ExportColors): string {
  if (!path.ports) return ''
  const texts = portTagTexts(edge, nameOf)
  return ([
    [path.ports.start, texts.start, true],
    [path.ports.end, texts.end, false],
  ] as const)
    .map(([tag, text, outgoing]) => {
      const shape = portTagShape(tag, text, outgoing)
      return `<g transform="${shape.transform}"><polygon points="${shape.points}" fill="${c.node}" stroke="${c.edge}" stroke-width="1.2" stroke-linejoin="round"/><text x="${shape.textX}" text-anchor="${shape.anchor}" dominant-baseline="central" font-size="${PORT_FONT_SIZE}" font-family="${FONT_MONO}" fill="${c.ink}">${escapeXml(text)}</text></g>`
    })
    .join('')
}

function edgeSvg(
  { edge }: ExportEdge,
  path: EdgePath | undefined,
  c: ExportColors,
  withLabels: boolean,
  nameOf: (id: string) => string,
): string {
  if (!path) return ''
  const style = edgeStyleFor(edge)
  const tone: Record<EdgeTone, string> = { edge: c.edge, muted: c.muted, cycle: c.cycle }
  const attrs = [
    `d="${path.d}"`,
    'fill="none"',
    `stroke="${tone[style.tone]}"`,
    `stroke-width="${style.strokeWidth}"`,
    style.dash ? `stroke-dasharray="${style.dash}"` : '',
    style.markerStart ? `marker-start="${markerRef(style.markerStart)}"` : '',
    style.markerEnd ? `marker-end="${markerRef(style.markerEnd)}"` : '',
  ]
    .filter(Boolean)
    .join(' ')
  const labels = (withLabels ? edgeLabels(edge, path) : [])
    .map(
      (l) =>
        `<text x="${l.placement.x}" y="${l.placement.y}" text-anchor="${l.placement.anchor}" font-size="${l.fontSize}" font-family="${FONT_UI}" fill="${c.ink}" stroke="${c.halo}" stroke-width="4" paint-order="stroke" stroke-linejoin="round" dominant-baseline="central">${escapeXml(l.text)}</text>`,
    )
    .join('')
  return `<g><path ${attrs}/>${portTagSvg(path, edge, nameOf, c)}${labels}</g>`
}

function groupSvg(g: GroupBox, dark: boolean, hueFor: HueFor): string {
  const paint = groupPaint(g.hueKey === null ? null : hueFor(g.hueKey), dark)
  return `<g transform="translate(${round(g.x)},${round(g.y)})"><rect width="${round(g.width)}" height="${round(g.height)}" rx="12" fill="${paint.fill}" stroke="${paint.stroke}" stroke-width="1.5" stroke-dasharray="6 4"/><text x="14" y="22" font-size="12.5" font-weight="500" font-family="${FONT_MONO}" fill="${paint.label}">${escapeXml(g.label)}</text></g>`
}

function nodeSvg(
  { node, geometry, x, y }: ExportNode,
  dark: boolean,
  hueFor: HueFor,
  c: ExportColors,
  focus: boolean,
  withId: boolean,
): string {
  const { width: w, height: h, headerHeight: hh, stereotype, compartments } = geometry
  const paint = paintForNode(node, dark, hueFor)
  const dash = node.kind === 'external' ? ' stroke-dasharray="5 4"' : ''
  const italic = node.kind === 'class' && node.abstract ? ' font-style="italic"' : ''
  const parts: string[] = [
    // A collapsed package gets a second card behind it, as on screen.
    node.kind === 'package'
      ? `<rect x="5" y="5" width="${w}" height="${h}" rx="${CORNER}" fill="${c.node}" stroke="${paint.stroke}" stroke-width="1.2"/>`
      : '',
    `<rect width="${w}" height="${h}" rx="${CORNER}" fill="${c.node}" stroke="${focus ? (c.selection ?? paint.stroke) : paint.stroke}" stroke-width="${focus ? 2.6 : 1.2}"${dash}/>`,
    `<path d="M0 ${hh}V${CORNER}Q0 0 ${CORNER} 0H${w - CORNER}Q${w} 0 ${w} ${CORNER}V${hh}Z" fill="${paint.header}" stroke="${paint.stroke}" stroke-width="1.2"/>`,
  ]
  if (stereotype) {
    parts.push(
      `<text x="${w / 2}" y="15" text-anchor="middle" font-size="10.5" font-style="italic" font-family="${FONT_UI}" fill="${c.muted}">${escapeXml(stereotype)}</text>`,
    )
  }
  parts.push(
    `<text x="${w / 2}" y="${stereotype ? 33 : 20}" text-anchor="middle" font-size="13" font-weight="600"${italic} font-family="${FONT_UI}" fill="${c.ink}">${escapeXml(node.name)}</text>`,
  )
  let top = hh
  for (const rows of compartments) {
    parts.push(
      `<line x1="0" x2="${w}" y1="${top}" y2="${top}" stroke="${paint.stroke}" stroke-width=".8" opacity=".7"/>`,
    )
    rows.forEach((row, i) => {
      parts.push(
        `<text x="10" y="${top + 5 + i * ROW_HEIGHT + ROW_HEIGHT / 2 + 4}" font-size="11.5" font-family="${FONT_MONO}" fill="${c.ink}" xml:space="preserve">${escapeXml(row)}</text>`,
      )
    })
    top += rows.length * ROW_HEIGHT + 10
  }
  const id = withId ? ` data-node-id="${escapeXml(node.id)}" style="cursor:pointer"` : ''
  return `<g${id} transform="translate(${round(x)},${round(y)})">${parts.join('')}</g>`
}

/** Serialises the whole diagram, whatever the current viewport shows, with no dimming or selection styling. */
export function buildDiagramSvg(input: ExportInput): DiagramSvg | null {
  if (!input.nodes.length) return null
  const boxes = new Map<string, Box>()
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const groups = computeGroupBoxes(
    input.nodes.map((n) => ({ node: n.node, x: n.x, y: n.y, width: n.geometry.width, height: n.geometry.height })),
    input.grouping ?? 'file',
  )
  for (const g of groups) {
    minX = Math.min(minX, g.x)
    minY = Math.min(minY, g.y)
    maxX = Math.max(maxX, g.x + g.width)
    maxY = Math.max(maxY, g.y + g.height)
  }
  for (const n of input.nodes) {
    boxes.set(n.node.id, { x: n.x, y: n.y, width: n.geometry.width, height: n.geometry.height })
    minX = Math.min(minX, n.x)
    minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x + n.geometry.width)
    maxY = Math.max(maxY, n.y + n.geometry.height)
  }
  const paths = routeEdges(
    boxes,
    input.edges,
    input.routing ?? 'straight',
    input.direction ?? 'TB',
    input.laidOut,
    input.isPorted,
  )
  const names = new Map(input.nodes.map((n) => [n.node.id, n.node.name]))
  const nameOf = (id: string) => names.get(id) ?? '?'
  for (const path of paths.values()) {
    // Port tags reach out beyond their stubs; this allows for the longest likely name.
    const reach = (tag: { at: { x: number; y: number }; direction: { x: number; y: number } }) => ({
      x: tag.at.x + tag.direction.x * 220,
      y: tag.at.y + tag.direction.y * 220,
    })
    const extra = path.ports ? [reach(path.ports.start), reach(path.ports.end)] : []
    for (const p of [path.start, path.end, ...extra]) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
  }
  const width = Math.ceil(maxX - minX + PADDING * 2)
  const height = Math.ceil(maxY - minY + PADDING * 2)
  const c = input.colors
  const body = [
    markerDefs(c),
    `<rect width="${width}" height="${height}" fill="${c.background}"/>`,
    `<g transform="translate(${round(PADDING - minX)} ${round(PADDING - minY)})">`,
    ...groups.map((g) => groupSvg(g, input.dark, input.hueFor)),
    ...input.edges.map((e) => edgeSvg(e, paths.get(e.edge.id), c, input.labels ?? true, nameOf)),
    ...input.nodes.map((n) => nodeSvg(n, input.dark, input.hueFor, c, n.node.id === input.focusId, !!input.nodeIds)),
    '</g>',
  ].join('\n')
  const size = input.fluid ? 'style="width:100%;height:auto"' : `width="${width}" height="${height}"`
  const text = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" ${size} viewBox="0 0 ${width} ${height}">\n${body}\n</svg>`
  return { text, width, height }
}

/** Scale for the PNG: up to 2x, but never more than 8,000px on either side. */
export function pngScale(width: number, height: number): number {
  return Math.min(2, 8000 / Math.max(width, height))
}
