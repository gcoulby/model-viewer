import { useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import { toast } from 'sonner'
import type { DiagramEdge } from '@/components/canvas/edges/edgeTypes'
import type { CanvasNode } from '@/components/canvas/nodes/nodeTypes'
import { useFileColors } from '@/hooks/useFileColors'
import { useDiagram } from '@/hooks/useDiagram'
import { useModels } from '@/hooks/useModels'
import { useTheme } from '@/hooks/useTheme'
import { downloadBlob } from '@/lib/download'
import { readExportColors } from '@/lib/ecore/exportColors'
import {
  buildDiagramSvg,
  pngScale,
  type DiagramSvg,
} from '@/lib/ecore/export'
import { computeParallel } from '@/lib/ecore/visibleGraph'

export type ExportFormat = 'svg' | 'png'

function renderPng(svg: DiagramSvg): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const scale = pngScale(svg.width, svg.height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(svg.width * scale)
      canvas.height = Math.round(svg.height * scale)
      const context = canvas.getContext('2d')
      if (!context) return reject(new Error('canvas'))
      context.scale(scale, scale)
      context.drawImage(image, 0, 0, svg.width, svg.height)
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('size'))), 'image/png')
    }
    image.onerror = () => reject(new Error('render'))
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.text)}`
  })
}

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
      if (format === 'svg') {
        downloadBlob(`${baseName}.svg`, new Blob([svg.text], { type: 'image/svg+xml' }))
        return
      }
      try {
        downloadBlob(`${baseName}.png`, await renderPng(svg))
      } catch (error) {
        toast.error(
          error instanceof Error && error.message === 'size'
            ? 'The image was too large to render.'
            : 'The browser could not render this diagram as an image. Try the SVG export.',
        )
      }
    },
    [getNodes, visible, models, theme, hueFor],
  )
}
