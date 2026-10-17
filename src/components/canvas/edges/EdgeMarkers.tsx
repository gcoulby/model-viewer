import type { MarkerKind } from '@/lib/ecore/edgeStyle'

export const MARKER_IDS: Record<MarkerKind, string> = {
  triangle: 'ecore-marker-triangle',
  diamond: 'ecore-marker-diamond',
  arrow: 'ecore-marker-arrow',
  arrowMuted: 'ecore-marker-arrow-muted',
}

/** Marker definitions referenced by every edge, drawn once. */
export function EdgeMarkers() {
  return (
    <svg className="absolute size-0" aria-hidden="true">
      <defs>
        <marker
          id={MARKER_IDS.triangle}
          viewBox="0 0 12 12"
          refX="11"
          refY="6"
          markerWidth="12"
          markerHeight="12"
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path d="M1 1.5L11 6L1 10.5z" className="fill-node stroke-edge" strokeWidth="1.3" strokeLinejoin="round" />
        </marker>
        <marker
          id={MARKER_IDS.diamond}
          viewBox="0 0 16 10"
          refX="0.5"
          refY="5"
          markerWidth="16"
          markerHeight="10"
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path d="M.5 5L8 .8L15.5 5L8 9.2z" className="fill-edge stroke-edge" strokeWidth="1" strokeLinejoin="round" />
        </marker>
        <marker
          id={MARKER_IDS.arrow}
          viewBox="0 0 11 10"
          refX="10"
          refY="5"
          markerWidth="11"
          markerHeight="10"
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path
            d="M1 1L10 5L1 9"
            className="fill-none stroke-edge"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
        <marker
          id={MARKER_IDS.arrowMuted}
          viewBox="0 0 11 10"
          refX="10"
          refY="5"
          markerWidth="11"
          markerHeight="10"
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path
            d="M1 1L10 5L1 9"
            className="fill-none stroke-muted-foreground"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      </defs>
    </svg>
  )
}
