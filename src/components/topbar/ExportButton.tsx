import { Button } from '@/components/ui/button'
import { useDiagram } from '@/hooks/useDiagram'
import { useDiagramExport, type ExportFormat } from '@/hooks/useDiagramExport'

export function ExportButton({ format }: { format: ExportFormat }) {
  const { graph } = useDiagram()
  const exportDiagram = useDiagramExport()
  return (
    <Button variant="outline" disabled={!graph} onClick={() => void exportDiagram(format)}>
      Export {format.toUpperCase()}
    </Button>
  )
}
