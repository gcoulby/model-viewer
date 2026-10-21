import { useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import type { DiagramEdge } from '@/components/canvas/edges/edgeTypes'
import type { CanvasNode } from '@/components/canvas/nodes/nodeTypes'
import { useFileColors } from '@/hooks/useFileColors'
import { useDiagram } from '@/hooks/useDiagram'
import { useModels } from '@/hooks/useModels'
import { usePorts } from '@/hooks/usePorts'
import { useTheme } from '@/hooks/useTheme'
import { useViewOptions } from '@/hooks/useViewOptions'
import { readExportColors } from '@/lib/ecore/exportColors'
import { buildDiagramSvg } from '@/lib/ecore/export'
import { saveDiagram, type ExportFormat } from '@/lib/ecore/saveDiagram'
import { portPredicate } from '@/lib/ecore/ports'
import { computeParallel } from '@/lib/ecore/visibleGraph'

export type { ExportFormat }

export function useDiagramExport() {
  const { getNodes } = useReactFlow<CanvasNode, DiagramEdge>()
  const { drawn, layout, shapingEdgeIds } = useDiagram()
  const { overrides } = usePorts()
  const { options, display } = useViewOptions()
  const { models } = useModels()
  const { theme } = useTheme()
  const { hueFor } = useFileColors()

  return useCallback(
    async (format: ExportFormat) => {
      if (!drawn) return
      const nodes = getNodes()
        .flatMap((n) => (n.type === 'fileGroup' ? [] : [n]))
        .map((n) => ({
          node: n.data.node,
          geometry: n.data.geometry,
          x: n.position.x,
          y: n.position.y,
        }))
      const parallel = computeParallel(drawn.edges)
      // With nothing selected, "on selection" links are hidden on screen, so they stay out of the file too.
      const edges = drawn.edges.flatMap((edge) => {
        const info = parallel.get(edge.id)
        const drawn = display.otherLinks === 'show' || shapingEdgeIds.has(edge.id)
        return info && drawn ? [{ edge, parallel: info }] : []
      })
      const svg = buildDiagramSvg({
        nodes,
        edges,
        dark: theme === 'dark',
        hueFor,
        colors: readExportColors(),
        grouping: options.grouping,
        routing: display.routing,
        direction: options.direction,
        laidOut: layout?.laidOut,
        labels: display.labels,
        isPorted: portPredicate(
          new Map(nodes.map((n) => [n.node.id, n.node])),
          display.ports,
          options.grouping,
          overrides,
          layout?.room,
        ),
        room: layout?.room,
      })
      if (!svg) return

      const first = models[0]
      const baseName = first ? first.fileName.replace(/^.*\//, '').replace(/\.[^.]+$/, '') : 'diagram'
      saveDiagram(svg, format, baseName)
    },
    [getNodes, drawn, layout, shapingEdgeIds, overrides, options, display, models, theme, hueFor],
  )
}
