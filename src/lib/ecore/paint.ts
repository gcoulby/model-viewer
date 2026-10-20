import type { GraphNode } from '@/types/graph'
import type { NodePaint } from '@/types/view'

/** Hue for a file key; the colour a file gets until the user picks one. */
export type HueFor = (fileKey: string) => number

const defaultHues = new Map<string, number>()

/** Default hues are handed out in first-seen order and stay fixed for the page's lifetime. */
export function defaultFileHue(fileKey: string): number {
  let hue = defaultHues.get(fileKey)
  if (hue === undefined) {
    hue = Math.round((defaultHues.size * 137.508 + 205) % 360)
    defaultHues.set(fileKey, hue)
  }
  return hue
}

export function paintForHue(hue: number, dark: boolean): NodePaint {
  return dark
    ? { header: `hsl(${hue},38%,25%)`, stroke: `hsl(${hue},40%,58%)` }
    : { header: `hsl(${hue},55%,90%)`, stroke: `hsl(${hue},38%,46%)` }
}

export function externalPaint(dark: boolean): NodePaint {
  return dark ? { header: '#26303c', stroke: '#6b7a8c' } : { header: '#e3e8ee', stroke: '#8b97a6' }
}

export function paintForNode(node: GraphNode, dark: boolean, hueFor: HueFor): NodePaint {
  return node.kind === 'external' ? externalPaint(dark) : paintForHue(hueFor(node.package.fileKey), dark)
}

export function dotColor(hue: number, dark: boolean): string {
  return dark ? `hsl(${hue},40%,58%)` : `hsl(${hue},45%,52%)`
}

/** Tinted fill and outline for the box drawn behind a file's nodes. */
export function groupPaint(hue: number | null, dark: boolean): { fill: string; stroke: string; label: string } {
  if (hue === null) {
    return dark
      ? { fill: 'hsla(215,15%,60%,.07)', stroke: 'hsla(215,15%,60%,.45)', label: 'hsl(215,15%,72%)' }
      : { fill: 'hsla(215,15%,40%,.05)', stroke: 'hsla(215,15%,40%,.4)', label: 'hsl(215,15%,38%)' }
  }
  return dark
    ? { fill: `hsla(${hue},40%,58%,.08)`, stroke: `hsla(${hue},40%,58%,.55)`, label: `hsl(${hue},45%,75%)` }
    : { fill: `hsla(${hue},50%,50%,.06)`, stroke: `hsla(${hue},38%,46%,.55)`, label: `hsl(${hue},45%,32%)` }
}

export const HUE_CHOICES = [0, 25, 50, 90, 140, 170, 195, 215, 245, 275, 305, 335] as const
