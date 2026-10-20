import type { GraphEdge, GraphNode, ParallelInfo } from '@/types/graph'
import type { NodeGeometry } from '@/types/view'
import { computeEdgePath, type Box } from './edgeGeometry'
import { edgeLabels, edgeStyleFor, type MarkerKind } from './edgeStyle'
import { ROW_HEIGHT } from './measure'
import { computeGroupBoxes, EXTERNAL_GROUP, type GroupBox } from './groups'
import { groupPaint, paintForNode, type HueFor } from './paint'

export interface ExportNode {
  node: GraphNode
  geometry: NodeGeometry
  x: number
  y: number
}

export interface ExportEdge {
  edge: GraphEdge
  parallel: ParallelInfo
}

export interface ExportColors {
  background: string
  node: string
  ink: string
  muted: string
  edge: string
  halo: string
}

export interface ExportInput {
  nodes: ExportNode[]
  edges: ExportEdge[]
  dark: boolean
  hueFor: HueFor
  colors: ExportColors
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
</defs>`
}

const markerRef = (kind: MarkerKind) => `url(#m-${kind})`

function edgeSvg(
  { edge, parallel }: ExportEdge,
  boxes: Map<string, Box>,
  c: ExportColors,
): string {
  const from = boxes.get(edge.from)
  const to = boxes.get(edge.to)
  if (!from || !to) return ''
  const style = edgeStyleFor(edge)
  const path = computeEdgePath(from, to, parallel, edge.from === edge.to)
  const attrs = [
    `d="${path.d}"`,
    'fill="none"',
    `stroke="${style.muted ? c.muted : c.edge}"`,
    `stroke-width="${style.strokeWidth}"`,
    style.dash ? `stroke-dasharray="${style.dash}"` : '',
    style.markerStart ? `marker-start="${markerRef(style.markerStart)}"` : '',
    style.markerEnd ? `marker-end="${markerRef(style.markerEnd)}"` : '',
  ]
    .filter(Boolean)
    .join(' ')
  const labels = edgeLabels(edge, path)
    .map(
      (l) =>
        `<text x="${l.placement.x}" y="${l.placement.y}" text-anchor="${l.placement.anchor}" font-size="${l.fontSize}" font-family="${FONT_UI}" fill="${c.ink}" stroke="${c.halo}" stroke-width="4" paint-order="stroke" stroke-linejoin="round" dominant-baseline="central">${escapeXml(l.text)}</text>`,
    )
    .join('')
  return `<g><path ${attrs}/>${labels}</g>`
}

function groupSvg(g: GroupBox, dark: boolean, hueFor: HueFor): string {
  const paint = groupPaint(g.key === EXTERNAL_GROUP ? null : hueFor(g.key), dark)
  return `<g transform="translate(${round(g.x)},${round(g.y)})"><rect width="${round(g.width)}" height="${round(g.height)}" rx="12" fill="${paint.fill}" stroke="${paint.stroke}" stroke-width="1.5" stroke-dasharray="6 4"/><text x="14" y="22" font-size="12.5" font-weight="500" font-family="${FONT_MONO}" fill="${paint.label}">${escapeXml(g.label)}</text></g>`
}

function nodeSvg({ node, geometry, x, y }: ExportNode, dark: boolean, hueFor: HueFor, c: ExportColors): string {
  const { width: w, height: h, headerHeight: hh, stereotype, compartments } = geometry
  const paint = paintForNode(node, dark, hueFor)
  const dash = node.kind === 'external' ? ' stroke-dasharray="5 4"' : ''
  const italic = node.kind === 'class' && node.abstract ? ' font-style="italic"' : ''
  const parts: string[] = [
    `<rect width="${w}" height="${h}" rx="${CORNER}" fill="${c.node}" stroke="${paint.stroke}" stroke-width="1.2"${dash}/>`,
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
  return `<g transform="translate(${round(x)},${round(y)})">${parts.join('')}</g>`
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
  const width = Math.ceil(maxX - minX + PADDING * 2)
  const height = Math.ceil(maxY - minY + PADDING * 2)
  const c = input.colors
  const body = [
    markerDefs(c),
    `<rect width="${width}" height="${height}" fill="${c.background}"/>`,
    `<g transform="translate(${round(PADDING - minX)} ${round(PADDING - minY)})">`,
    ...groups.map((g) => groupSvg(g, input.dark, input.hueFor)),
    ...input.edges.map((e) => edgeSvg(e, boxes, c)),
    ...input.nodes.map((n) => nodeSvg(n, input.dark, input.hueFor, c)),
    '</g>',
  ].join('\n')
  const text = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${body}\n</svg>`
  return { text, width, height }
}

/** Scale for the PNG: up to 2x, but never more than 8,000px on either side. */
export function pngScale(width: number, height: number): number {
  return Math.min(2, 8000 / Math.max(width, height))
}
