import { useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import type { DiagramEdge } from '@/components/canvas/edges/edgeTypes'
import type { CanvasNode } from '@/components/canvas/nodes/nodeTypes'
import { useFileColors } from '@/hooks/useFileColors'
import { useDiagram } from '@/hooks/useDiagram'
import { useModels } from '@/hooks/useModels'
import { useTheme } from '@/hooks/useTheme'
import { readExportColors } from '@/lib/ecore/exportColors'
import { buildDiagramSvg } from '@/lib/ecore/export'
import { saveDiagram, type ExportFormat } from '@/lib/ecore/saveDiagram'
import { computeParallel } from '@/lib/ecore/visibleGraph'

export type { ExportFormat }

export function useDiagramExport() {
  const { getNodes } = useReactFlow<CanvasNode, DiagramEdge>()
  const { visible } = useDiagram()
  const { models } = useModels()
  const { theme } = useTheme()
  const { hueFor } = useFileColors()

  return useCallback(
    async (format: ExportFormat) => {
      if (!visible) return
      const nodes = getNodes()
        .flatMap((n) => (n.type === 'fileGroup' ? [] : [n]))
        .map((n) => ({
          node: n.data.node,
          geometry: n.data.geometry,
          x: n.position.x,
          y: n.position.y,
        }))
      const parallel = computeParallel(visible.edges)
      const edges = visible.edges.flatMap((edge) => {
        const info = parallel.get(edge.id)
        return info ? [{ edge, parallel: info }] : []
      })
      const svg = buildDiagramSvg({ nodes, edges, dark: theme === 'dark', hueFor, colors: readExportColors() })
      if (!svg) return

      const first = models[0]
      const baseName = first ? first.fileName.replace(/^.*\//, '').replace(/\.[^.]+$/, '') : 'diagram'
      saveDiagram(svg, format, baseName)
    },
    [getNodes, visible, models, theme, hueFor],
  )
}
