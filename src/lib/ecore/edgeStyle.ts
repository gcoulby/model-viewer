import type { FeatureGraphEdge, GraphEdge } from '@/types/graph'
import { multiplicitySuffix } from './format'
import { placeLabel, type EdgePath, type LabelPlacement } from './edgeGeometry'

export type MarkerKind = 'triangle' | 'diamond' | 'arrow' | 'arrowMuted'

export interface EdgeStyle {
  strokeWidth: number
  /** SVG dash pattern, or null for a solid line. */
  dash: string | null
  muted: boolean
  markerStart: MarkerKind | null
  markerEnd: MarkerKind | null
}

export interface EdgeLabel {
  text: string
  fontSize: number
  placement: LabelPlacement
}

export function edgeStyleFor(edge: GraphEdge): EdgeStyle {
  const merged = edge.kind !== 'inherit' && edge.back !== null
  const derived = edge.kind !== 'inherit' && edge.kind !== 'enumLink' && edge.forward.feature.derived
  switch (edge.kind) {
    case 'inherit':
      return { strokeWidth: 1.4, dash: null, muted: false, markerStart: null, markerEnd: 'triangle' }
    case 'containment':
      return {
        strokeWidth: 1.4,
        dash: derived ? '7 4' : null,
        muted: false,
        markerStart: 'diamond',
        markerEnd: merged ? null : 'arrow',
      }
    case 'reference':
      return {
        strokeWidth: 1.4,
        dash: derived ? '7 4' : null,
        muted: false,
        markerStart: null,
        markerEnd: merged ? null : 'arrow',
      }
    case 'enumLink':
      return { strokeWidth: 1, dash: '4 4', muted: true, markerStart: null, markerEnd: 'arrowMuted' }
  }
}

export function edgeLabels(edge: GraphEdge, path: EdgePath): EdgeLabel[] {
  if (edge.kind === 'inherit') return []
  const labels: EdgeLabel[] = []
  const name = edge.forward.feature.name
  if (edge.kind === 'enumLink') {
    labels.push({
      text: name,
      fontSize: 10,
      placement: placeLabel(path.end, { x: -path.endDirection.x, y: -path.endDirection.y }, 8),
    })
    return labels
  }
  const featureEdge: FeatureGraphEdge = edge
  labels.push({
    text: name + multiplicitySuffix(featureEdge.forward.feature.multiplicity),
    fontSize: 11,
    placement: placeLabel(path.end, { x: -path.endDirection.x, y: -path.endDirection.y }, 8),
  })
  if (featureEdge.back) {
    labels.push({
      text: featureEdge.back.feature.name + multiplicitySuffix(featureEdge.back.feature.multiplicity),
      fontSize: 11,
      placement: placeLabel(path.start, path.startDirection, edge.kind === 'containment' ? 26 : 10),
    })
  }
  return labels
}

export function edgeTitle(edge: GraphEdge, nameOf: (id: string) => string): string {
  const from = nameOf(edge.from)
  const to = nameOf(edge.to)
  if (edge.kind === 'inherit') return `${from} extends ${to}`
  if (edge.kind === 'enumLink') return `${from}.${edge.forward.feature.name} : ${to}`
  const mult = multiplicitySuffix(edge.forward.feature.multiplicity)
  const containment = edge.kind === 'containment' ? ' (containment)' : ''
  const opposite = edge.back ? `, opposite ${edge.back.feature.name}` : ''
  return `${from}.${edge.forward.feature.name} to ${to}${mult}${containment}${opposite}`
}
