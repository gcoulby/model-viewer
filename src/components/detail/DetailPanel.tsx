import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useIsMobile } from '@/hooks/use-mobile'
import { useResizableWidth } from '@/hooks/useResizableWidth'
import { useDiagram } from '@/hooks/useDiagram'
import { useSelection } from '@/hooks/useSelection'
import { DetailContent } from './DetailContent'
import { PanelResizeHandle } from './PanelResizeHandle'

export function DetailPanel() {
  const { graph } = useDiagram()
  const { selectedId, clear } = useSelection()
  const isMobile = useIsMobile()
  const { width, startResize } = useResizableWidth('ecore-viewer:detail-width', 344, 280, 760, 'left')
  const node = graph && selectedId ? graph.nodes.get(selectedId) : undefined

  if (isMobile) {
    return (
      <Drawer open={!!node} modal={false} onOpenChange={(open) => !open && clear()}>
        <DrawerContent className="max-h-[52dvh]">
          <DrawerTitle className="sr-only">Details</DrawerTitle>
          <DrawerDescription className="sr-only">Details of the selected type</DrawerDescription>
          <ScrollArea className="min-h-0 flex-1">
            <div className="px-4 pt-3.5 pb-6">
              {graph && node && <DetailContent graph={graph} node={node} onClose={clear} />}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    )
  }

  if (!graph || !node) return null
  return (
    <aside
      aria-label="Details"
      style={{ width }}
      className="relative flex min-h-0 flex-none flex-col border-l bg-card"
    >
      <PanelResizeHandle onPointerDown={startResize} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 pt-3.5 pb-6">
          <DetailContent graph={graph} node={node} onClose={clear} />
        </div>
      </ScrollArea>
    </aside>
  )
}
