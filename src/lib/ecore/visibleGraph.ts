import type { EdgeKind, GraphEdge, GraphNode, ModelGraph, ParallelInfo } from '@/types/graph'
import type { ViewOptions } from '@/types/view'

export interface VisibleGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
  nodeIds: Set<string>
}

function nodeVisible(node: GraphNode, options: ViewOptions): boolean {
  switch (node.kind) {
    case 'enum':
      return options.enums
    case 'datatype':
      return options.dataTypes
    case 'external':
      return options.external
    case 'class':
      return true
  }
}

export function edgeKindVisible(kind: EdgeKind, options: ViewOptions): boolean {
  switch (kind) {
    case 'inherit':
      return options.inheritance
    case 'enumLink':
      return options.enumLinks
    case 'containment':
    case 'reference':
      return options.references
  }
}

export function computeVisible(graph: ModelGraph, options: ViewOptions): VisibleGraph {
  const nodes = [...graph.nodes.values()].filter((n) => nodeVisible(n, options))
  const nodeIds = new Set(nodes.map((n) => n.id))
  const edges = graph.edges.filter(
    (e) => nodeIds.has(e.from) && nodeIds.has(e.to) && edgeKindVisible(e.kind, options),
  )
  return { nodes, edges, nodeIds }
}

/** Numbers every edge among the edges that join the same pair of nodes (or the same node, for loops). */
export function computeParallel(edges: GraphEdge[]): Map<string, ParallelInfo> {
  const groups = new Map<string, GraphEdge[]>()
  for (const e of edges) {
    const key =
      e.from === e.to ? `self|${e.from}` : e.from < e.to ? `${e.from}>${e.to}` : `${e.to}>${e.from}`
    const group = groups.get(key)
    if (group) group.push(e)
    else groups.set(key, [e])
  }
  const info = new Map<string, ParallelInfo>()
  for (const group of groups.values()) {
    group.forEach((e, index) => {
      info.set(e.id, { index, count: group.length, flip: e.from < e.to ? 1 : -1 })
    })
  }
  return info
}

/** Ids of the selected node, its neighbours and the edges touching it. */
export function neighbourhood(
  edges: GraphEdge[],
  selectedId: string,
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const nodeIds = new Set([selectedId])
  const edgeIds = new Set<string>()
  for (const e of edges) {
    if (e.from === selectedId || e.to === selectedId) {
      nodeIds.add(e.from)
      nodeIds.add(e.to)
      edgeIds.add(e.id)
    }
  }
  return { nodeIds, edgeIds }
}
