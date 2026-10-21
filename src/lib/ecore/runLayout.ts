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
  settings: LayoutSettings,
  loadElk: () => Promise<ELK>,
): Promise<LayoutOutcome> {
  if (settings.algorithm === 'dagre') return { result: layoutWithDagre(nodes, edges, geometry, settings), failure: null }
  try {
    const elk = await loadElk()
    return { result: await layoutWithElk(elk, nodes, edges, geometry, settings), failure: null }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return { result: layoutWithDagre(nodes, edges, geometry, settings), failure: reason }
  }
}
