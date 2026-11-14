import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useIsMobile } from '@/hooks/use-mobile'
import { useResizableSize } from '@/hooks/useResizableSize'
import { PropertiesPanel } from '@/components/edit/PropertiesPanel'
import { useDiagram } from '@/hooks/useDiagram'
import { useEditorMode } from '@/hooks/useEditorMode'
import { useModels } from '@/hooks/useModels'
import { useSelection } from '@/hooks/useSelection'
import { DetailPanelBody } from './DetailPanelBody'
import { PanelResizeHandle } from './PanelResizeHandle'

export function DetailPanel() {
  const { graph, drawn } = useDiagram()
  const { selectedId, clear } = useSelection()
  const isMobile = useIsMobile()
  const { size: width, startResize } = useResizableSize('ecore-viewer:detail-width', 344, 280, 760, 'left')
  const { mode } = useEditorMode()
  const { files } = useModels()
  const known =
    !!graph &&
    !!selectedId &&
    (graph.nodes.has(selectedId) ||
      !!drawn?.nodeIds.has(selectedId) ||
      !!drawn?.edges.some((e) => e.id === selectedId))

  // In edit mode the panel edits properties, and stays open while any file is open.
  if (mode === 'edit') {
    if (!files.length) return null
    if (isMobile) {
      return (
        <Drawer open modal={false}>
          <DrawerContent className="max-h-[52dvh]">
            <DrawerTitle className="sr-only">Properties</DrawerTitle>
            <DrawerDescription className="sr-only">Properties of the selection</DrawerDescription>
            <ScrollArea className="min-h-0 flex-1">
              <div className="px-4 pt-3.5 pb-6">
                <PropertiesPanel />
              </div>
            </ScrollArea>
          </DrawerContent>
        </Drawer>
      )
    }
    return (
      <aside aria-label="Properties" style={{ width }} className="relative flex min-h-0 flex-none flex-col border-l bg-card">
        <PanelResizeHandle onPointerDown={startResize} />
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-4 pt-3.5 pb-6">
            <PropertiesPanel />
          </div>
        </ScrollArea>
      </aside>
    )
  }

  if (isMobile) {
    return (
      <Drawer open={known} modal={false} onOpenChange={(open) => !open && clear()}>
        <DrawerContent className="max-h-[52dvh]">
          <DrawerTitle className="sr-only">Details</DrawerTitle>
          <DrawerDescription className="sr-only">Details of the selection</DrawerDescription>
          <ScrollArea className="min-h-0 flex-1">
            <div className="px-4 pt-3.5 pb-6">
              {graph && selectedId && known && <DetailPanelBody graph={graph} selectedId={selectedId} onClose={clear} />}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    )
  }

  if (!graph || !selectedId || !known) return null
  return (
    <aside
      aria-label="Details"
      style={{ width }}
      className="relative flex min-h-0 flex-none flex-col border-l bg-card"
    >
      <PanelResizeHandle onPointerDown={startResize} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 pt-3.5 pb-6">
          <DetailPanelBody graph={graph} selectedId={selectedId} onClose={clear} />
        </div>
      </ScrollArea>
    </aside>
  )
}
