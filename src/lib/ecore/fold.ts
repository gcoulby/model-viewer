import type { DependencyEdge, DrawnEdge, DrawnNode, GraphEdge, PackageBlockNode } from '@/types/graph'
import type { VisibleGraph } from './visibleGraph'

export interface DrawnGraph {
  nodes: DrawnNode[]
  edges: DrawnEdge[]
  nodeIds: Set<string>
  /** For each type folded into a package block, the block's id. */
  blockOf: Map<string, string>
}

export const blockIdOf = (scopeId: string) => `package|${scopeId}`

/** True for a merged pair of opposite references, which depend on each other both ways. */
const bothWays = (edge: GraphEdge) => edge.kind !== 'inherit' && edge.back !== null

/**
 * Replaces the types of every collapsed package (named by scope id) with one block per package. Links
 * inside a block disappear; links touching a block are merged into one dependency per pair of boxes,
 * keeping the links behind it in each direction. Subpackages fold on their own, never into their parent.
 */
export function foldPackages(visible: VisibleGraph, folded: ReadonlySet<string>): DrawnGraph {
  if (!folded.size) return { ...visible, blockOf: new Map() }

  const blocks = new Map<string, PackageBlockNode>()
  const blockOf = new Map<string, string>()
  const nodes: DrawnNode[] = []
  for (const node of visible.nodes) {
    if (node.kind === 'external' || !folded.has(node.package.scopeId)) {
      nodes.push(node)
      continue
    }
    const id = blockIdOf(node.package.scopeId)
    let block = blocks.get(id)
    if (!block) {
      block = {
        kind: 'package',
        id,
        name: node.package.fullName,
        package: node.package,
        memberIds: [],
        counts: { classes: 0, enums: 0, dataTypes: 0 },
        outgoing: 0,
        incoming: 0,
        superIds: [],
        subIds: [],
      }
      blocks.set(id, block)
      nodes.push(block)
    }
    block.memberIds.push(node.id)
    if (node.kind === 'class') block.counts.classes += 1
    else if (node.kind === 'enum') block.counts.enums += 1
    else block.counts.dataTypes += 1
    blockOf.set(node.id, id)
  }

  const edges: DrawnEdge[] = []
  const dependencies = new Map<string, DependencyEdge>()
  for (const edge of visible.edges) {
    const from = blockOf.get(edge.from) ?? edge.from
    const to = blockOf.get(edge.to) ?? edge.to
    if (from === edge.from && to === edge.to) {
      edges.push(edge)
      continue
    }
    if (from === to) continue
    const key = from < to ? `${from}\n${to}` : `${to}\n${from}`
    let dependency = dependencies.get(key)
    if (!dependency) {
      dependency = { id: `dependency|${key}`, kind: 'dependency', from, to, forward: [], back: [] }
      dependencies.set(key, dependency)
      edges.push(dependency)
    }
    const forward = dependency.from === from
    ;(forward ? dependency.forward : dependency.back).push(edge)
    if (bothWays(edge)) (forward ? dependency.back : dependency.forward).push(edge)
    const count = (id: string, direction: 'outgoing' | 'incoming') => {
      const block = blocks.get(id)
      if (block) block[direction] += 1
    }
    count(from, 'outgoing')
    count(to, 'incoming')
    if (bothWays(edge)) {
      count(to, 'outgoing')
      count(from, 'incoming')
    }
  }

  return { nodes, edges, nodeIds: new Set(nodes.map((n) => n.id)), blockOf }
}
