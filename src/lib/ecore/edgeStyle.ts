import type { DependencyEdge, DrawnEdge, FeatureGraphEdge } from '@/types/graph'
import { multiplicitySuffix } from './format'
import { placeLabel, type EdgePath, type LabelPlacement } from './edgeGeometry'

export type MarkerKind = 'triangle' | 'diamond' | 'arrow' | 'arrowMuted' | 'arrowCycle'

/** Which theme colour a link is drawn in: the usual edge colour, muted, or the colour for cycles. */
export type EdgeTone = 'edge' | 'muted' | 'cycle'

export interface EdgeStyle {
  strokeWidth: number
  /** SVG dash pattern, or null for a solid line. */
  dash: string | null
  tone: EdgeTone
  markerStart: MarkerKind | null
  markerEnd: MarkerKind | null
}

export interface EdgeLabel {
  text: string
  fontSize: number
  placement: LabelPlacement
}

/** A dependency that runs both ways is a cycle between the two boxes. */
export const isCycle = (edge: DependencyEdge) => edge.forward.length > 0 && edge.back.length > 0

/** "3" for links one way, "3 / 1" when some run back the other way. */
export function dependencyCount(edge: DependencyEdge): string {
  return edge.back.length ? `${edge.forward.length} / ${edge.back.length}` : String(edge.forward.length)
}

export function edgeStyleFor(edge: DrawnEdge): EdgeStyle {
  if (edge.kind === 'dependency') {
    const cycle = isCycle(edge)
    return {
      strokeWidth: 1.4,
      dash: null,
      tone: cycle ? 'cycle' : 'edge',
      markerStart: cycle ? 'arrowCycle' : null,
      markerEnd: cycle ? 'arrowCycle' : 'arrow',
    }
  }
  const merged = edge.kind !== 'inherit' && edge.back !== null
  const derived = edge.kind !== 'inherit' && edge.kind !== 'enumLink' && edge.forward.feature.derived
  switch (edge.kind) {
    case 'inherit':
      return { strokeWidth: 1.4, dash: null, tone: 'edge', markerStart: null, markerEnd: 'triangle' }
    case 'containment':
      return {
        strokeWidth: 1.4,
        dash: derived ? '7 4' : null,
        tone: 'edge',
        markerStart: 'diamond',
        markerEnd: merged ? null : 'arrow',
      }
    case 'reference':
      return {
        strokeWidth: 1.4,
        dash: derived ? '7 4' : null,
        tone: 'edge',
        markerStart: null,
        markerEnd: merged ? null : 'arrow',
      }
    case 'enumLink':
      return { strokeWidth: 1, dash: '4 4', tone: 'muted', markerStart: null, markerEnd: 'arrowMuted' }
  }
}

export function edgeLabels(edge: DrawnEdge, path: EdgePath): EdgeLabel[] {
  // A ported link names its feature and count on its port tags instead.
  if (edge.kind === 'inherit' || path.ports) return []
  if (edge.kind === 'dependency') {
    return [{ text: dependencyCount(edge), fontSize: 11, placement: { ...path.mid, anchor: 'middle' } }]
  }
  const labels: EdgeLabel[] = []
  const name = edge.forward.feature.name
  if (edge.kind === 'enumLink') {
    labels.push({
      text: name,
      fontSize: 10,
      placement: placeLabel(path.end, { x: -path.endDirection.x, y: -path.endDirection.y }, 8, path.endLabel),
    })
    return labels
  }
  const featureEdge: FeatureGraphEdge = edge
  labels.push({
    text: name + multiplicitySuffix(featureEdge.forward.feature.multiplicity),
    fontSize: 11,
    placement: placeLabel(path.end, { x: -path.endDirection.x, y: -path.endDirection.y }, 8, path.endLabel),
  })
  if (featureEdge.back) {
    labels.push({
      text: featureEdge.back.feature.name + multiplicitySuffix(featureEdge.back.feature.multiplicity),
      fontSize: 11,
      placement: placeLabel(path.start, path.startDirection, edge.kind === 'containment' ? 26 : 10, path.startLabel),
    })
  }
  return labels
}

export function edgeTitle(edge: DrawnEdge, nameOf: (id: string) => string): string {
  const from = nameOf(edge.from)
  const to = nameOf(edge.to)
  if (edge.kind === 'dependency') {
    const back = edge.back.length ? `, ${edge.back.length} back from ${to}` : ''
    return `${edge.forward.length} links from ${from} to ${to}${back}. Click to list them.`
  }
  if (edge.kind === 'inherit') return `${from} extends ${to}`
  if (edge.kind === 'enumLink') return `${from}.${edge.forward.feature.name} : ${to}`
  const mult = multiplicitySuffix(edge.forward.feature.multiplicity)
  const containment = edge.kind === 'containment' ? ' (containment)' : ''
  const opposite = edge.back ? `, opposite ${edge.back.feature.name}` : ''
  return `${from}.${edge.forward.feature.name} to ${to}${mult}${containment}${opposite}`
}
