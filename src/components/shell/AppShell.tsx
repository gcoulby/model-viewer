import { PasteDialog } from '@/components/dialogs/PasteDialog'
import { DetailPanel } from '@/components/detail/DetailPanel'
import { DiagramCanvas } from '@/components/canvas/DiagramCanvas'
import { ModelSidebar } from '@/components/sidebar/ModelSidebar'
import { TopBar } from '@/components/topbar/TopBar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { SidebarResizeHandle } from '@/components/sidebar/SidebarResizeHandle'
import { useResizableWidth } from '@/hooks/useResizableWidth'
import { useEscapeToDeselect } from '@/hooks/useEscapeToDeselect'

export function AppShell() {
  useEscapeToDeselect()
  const { width, startResize } = useResizableWidth('ecore-viewer:sidebar-width', 292, 220, 560, 'right')
  return (
    <SidebarProvider
      className="h-svh min-h-0 flex-col"
      style={{ '--sidebar-width': `${width}px` } as React.CSSProperties}
    >
      <TopBar />
      <div className="relative flex min-h-0 flex-1">
        <ModelSidebar />
        <SidebarResizeHandle width={width} onPointerDown={startResize} />
        <DiagramCanvas />
        <DetailPanel />
      </div>
      <PasteDialog />
    </SidebarProvider>
  )
}
