import { toast } from 'sonner'
import { downloadBlob } from '@/lib/download'
import { pngScale, type DiagramSvg } from './export'

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

/** Downloads the diagram as `<baseName>.svg` or `.png`, reporting a failed PNG render as a toast. */
export async function saveDiagram(svg: DiagramSvg, format: ExportFormat, baseName: string) {
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
}
