import type { GraphEdge, GraphNode } from '@/types/graph'
import type { LayoutSettings } from '@/types/view'

function modeIncludes(edge: GraphEdge, mode: LayoutSettings['layoutMode']): boolean {
  switch (mode) {
    case 'layered':
      return true
    case 'structure':
      return edge.kind === 'inherit' || edge.kind === 'containment'
    case 'inheritance':
      return edge.kind === 'inherit'
  }
}

/**
 * The edges that decide where boxes go; the rest are only drawn over the result. With `pullIn`, a box
 * that none of the mode's links reach is placed by all of its own links instead, so it lands beside the
 * boxes it relates to rather than in a heap of strays.
 */
export function layoutEdges(nodes: GraphNode[], edges: GraphEdge[], settings: LayoutSettings): GraphEdge[] {
  if (settings.algorithm === 'grid') return []
  const chosen = edges.filter((e) => modeIncludes(e, settings.layoutMode))
  if (!settings.pullIn || chosen.length === edges.length) return chosen

  const reached = new Set<string>()
  for (const e of chosen) {
    reached.add(e.from)
    reached.add(e.to)
  }
  const strays = new Set(nodes.filter((n) => !reached.has(n.id)).map((n) => n.id))
  if (!strays.size) return chosen
  return edges.filter((e) => modeIncludes(e, settings.layoutMode) || strays.has(e.from) || strays.has(e.to))
}
