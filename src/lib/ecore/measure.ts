import type { DrawnNode, PackageBlockNode } from '@/types/graph'
import type { NodeGeometry, ViewOptions } from '@/types/view'
import { attributeRow, capRows, operationRow, stereotypeOf } from './format'

export const ROW_HEIGHT = 16
export const MIN_NODE_WIDTH = 132
export const MAX_NODE_WIDTH = 430
const HEADER_HEIGHT = 30
const HEADER_HEIGHT_WITH_STEREOTYPE = 42
const COMPARTMENT_PADDING = 10
const FONT_LOAD_TIMEOUT_MS = 1500

export const FONT_NAME = '600 13px "IBM Plex Sans", system-ui, sans-serif'
export const FONT_NAME_ITALIC = 'italic 600 13px "IBM Plex Sans", system-ui, sans-serif'
export const FONT_STEREOTYPE = 'italic 400 10.5px "IBM Plex Sans", system-ui, sans-serif'
export const FONT_ROW = '400 11.5px "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace'

export type TextMeasurer = (text: string, font: string) => number

/** Measures with a canvas when one is available and falls back to a per-character estimate otherwise. */
export function createTextMeasurer(): TextMeasurer {
  let context: CanvasRenderingContext2D | null = null
  try {
    context = document.createElement('canvas').getContext('2d')
  } catch {
    context = null
  }
  return (text, font) => {
    if (context) {
      context.font = font
      return context.measureText(text).width * 1.03
    }
    const size = parseFloat(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? '12')
    return text.length * size * 0.6 * 1.03
  }
}

export function clipText(text: string, font: string, maxWidth: number, measure: TextMeasurer): string {
  if (measure(text, font) <= maxWidth) return text
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (measure(`${text.slice(0, mid)}…`, font) <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return `${text.slice(0, lo)}…`
}

/** Resolves once the diagram fonts are ready, or after a timeout so a slow font never blocks drawing. */
export async function waitForFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return
  const loading = Promise.all([
    document.fonts.load('400 12px "IBM Plex Mono"'),
    document.fonts.load('600 13px "IBM Plex Sans"'),
  ]).catch(() => undefined)
  await Promise.race([loading, new Promise((resolve) => setTimeout(resolve, FONT_LOAD_TIMEOUT_MS))])
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** What a collapsed package holds, and how many links cross its edge each way. */
function packageRows(block: PackageBlockNode): string[][] {
  const { classes, enums, dataTypes } = block.counts
  const contents = [
    classes ? plural(classes, 'class', 'classes') : '',
    enums ? plural(enums, 'enum', 'enums') : '',
    dataTypes ? plural(dataTypes, 'data type', 'data types') : '',
  ].filter(Boolean)
  return [contents, [`${block.incoming} in · ${block.outgoing} out`]]
}

function compartmentsOf(node: DrawnNode, options: ViewOptions): string[][] {
  const compartments: string[][] = []
  switch (node.kind) {
    case 'class':
      if (options.attributes && node.attributes.length) compartments.push(capRows(node.attributes.map(attributeRow)))
      if (options.operations && node.operations.length) compartments.push(capRows(node.operations.map(operationRow)))
      break
    case 'enum':
      if (node.literals.length) compartments.push(capRows(node.literals.map((l) => `${l.name} = ${l.value}`)))
      break
    case 'datatype':
      if (node.instanceClassName) compartments.push([node.instanceClassName])
      break
    case 'external':
      compartments.push([node.source])
      break
    case 'package':
      compartments.push(...packageRows(node))
      break
  }
  return compartments
}

export function computeGeometry(
  node: DrawnNode,
  options: ViewOptions,
  collapsed: boolean,
  measure: TextMeasurer,
): NodeGeometry {
  const stereotype = stereotypeOf(node)
  const compartments = collapsed ? [] : compartmentsOf(node, options)
  const isAbstract = node.kind === 'class' && node.abstract
  const nameFont = isAbstract ? FONT_NAME_ITALIC : FONT_NAME

  let width = Math.max(
    measure(node.name, nameFont) + 30,
    stereotype ? measure(stereotype, FONT_STEREOTYPE) + 30 : 0,
    MIN_NODE_WIDTH,
  )
  for (const rows of compartments) for (const row of rows) width = Math.max(width, measure(row, FONT_ROW) + 22)
  width = Math.min(Math.ceil(width), MAX_NODE_WIDTH)

  const headerHeight = stereotype ? HEADER_HEIGHT_WITH_STEREOTYPE : HEADER_HEIGHT
  const clipped = compartments.map((rows) => rows.map((r) => clipText(r, FONT_ROW, width - 22, measure)))
  const height =
    headerHeight + clipped.reduce((sum, rows) => sum + rows.length * ROW_HEIGHT + COMPARTMENT_PADDING, 0)

  return { width, height, headerHeight, stereotype, compartments: clipped, collapsed }
}
