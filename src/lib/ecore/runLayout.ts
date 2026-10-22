import type { ELK } from 'elkjs/lib/elk-api'
import type { DrawnEdge, DrawnNode } from '@/types/graph'
import type { LayoutSettings, NodeGeometry } from '@/types/view'
import { layoutWithElk } from './elkLayout'
import type { LayoutResult } from './layout'
import { layoutWithDagre } from './layoutGroups'

export interface LayoutOutcome {
  result: LayoutResult
  /** Set when the chosen algorithm failed and the classic layered layout was used instead. */
  failure: string | null
}

export async function runLayout(
  nodes: DrawnNode[],
  edges: DrawnEdge[],
  geometry: Map<string, NodeGeometry>,
  requested: LayoutSettings,
  loadElk: () => Promise<ELK>,
): Promise<LayoutOutcome> {
  // With every link drawn as tags, nothing needs rows or routes, so boxes are packed like a schematic sheet.
  const settings: LayoutSettings = requested.tagsOnly ? { ...requested, algorithm: 'grid' } : requested
  if (settings.algorithm === 'dagre') return { result: layoutWithDagre(nodes, edges, geometry, settings), failure: null }
  try {
    const elk = await loadElk()
    return { result: await layoutWithElk(elk, nodes, edges, geometry, settings), failure: null }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return { result: layoutWithDagre(nodes, edges, geometry, settings), failure: reason }
  }
}
