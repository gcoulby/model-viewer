import type { GraphNode, PackageInfo } from '@/types/graph'
import type { NodePaint } from '@/types/view'

const hueByPackage = new Map<string, number>()

/** Package hues are handed out in first-seen order and stay fixed for the page's lifetime. */
export function packageHue(pkg: PackageInfo): number {
  const key = `${pkg.modelIndex}|${pkg.fullName}`
  let hue = hueByPackage.get(key)
  if (hue === undefined) {
    hue = Math.round((hueByPackage.size * 137.508 + 205) % 360)
    hueByPackage.set(key, hue)
  }
  return hue
}

export function resetPackageHues() {
  hueByPackage.clear()
}

export function paintForHue(hue: number, dark: boolean): NodePaint {
  return dark
    ? { header: `hsl(${hue},38%,25%)`, stroke: `hsl(${hue},40%,58%)` }
    : { header: `hsl(${hue},55%,90%)`, stroke: `hsl(${hue},38%,46%)` }
}

export function externalPaint(dark: boolean): NodePaint {
  return dark ? { header: '#26303c', stroke: '#6b7a8c' } : { header: '#e3e8ee', stroke: '#8b97a6' }
}

export function paintForNode(node: GraphNode, dark: boolean): NodePaint {
  return node.kind === 'external' ? externalPaint(dark) : paintForHue(packageHue(node.package), dark)
}

export function packageDotColor(pkg: PackageInfo, dark: boolean): string {
  const hue = packageHue(pkg)
  return dark ? `hsl(${hue},40%,58%)` : `hsl(${hue},45%,52%)`
}
