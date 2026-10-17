import type { ClassGraphNode, GraphNode, ModelGraph } from '@/types/graph'

/** All supertypes, transitively, nearest first, each listed once. */
export function ancestorsOf(graph: ModelGraph, node: GraphNode): GraphNode[] {
  const seen = new Set<string>()
  const out: GraphNode[] = []
  const walk = (current: GraphNode) => {
    for (const id of current.superIds) {
      if (seen.has(id)) continue
      seen.add(id)
      const parent = graph.nodes.get(id)
      if (!parent) continue
      out.push(parent)
      walk(parent)
    }
  }
  walk(node)
  return out
}

/** Ancestor classes that contribute attributes or references to `node`. */
export function inheritedSources(graph: ModelGraph, node: ClassGraphNode): ClassGraphNode[] {
  return ancestorsOf(graph, node).filter(
    (a): a is ClassGraphNode => a.kind === 'class' && (a.attributes.length > 0 || a.references.length > 0),
  )
}

/** Classes with an attribute typed by this enum or data type. Empty for any other kind of node. */
export function usedBy(graph: ModelGraph, node: GraphNode): ClassGraphNode[] {
  if (node.kind !== 'enum' && node.kind !== 'datatype') return []
  const users: ClassGraphNode[] = []
  for (const candidate of graph.nodes.values()) {
    if (candidate.kind === 'class' && candidate.attributes.some((a) => a.typeNodeId === node.id)) {
      users.push(candidate)
    }
  }
  return users
}
