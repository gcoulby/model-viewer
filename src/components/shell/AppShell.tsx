import { PasteDialog } from '@/components/dialogs/PasteDialog'
import { DetailPanel } from '@/components/detail/DetailPanel'
import { DiagramCanvas } from '@/components/canvas/DiagramCanvas'
import { ModelSidebar } from '@/components/sidebar/ModelSidebar'
import { TopBar } from '@/components/topbar/TopBar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useEscapeToDeselect } from '@/hooks/useEscapeToDeselect'

export function AppShell() {
  useEscapeToDeselect()
  return (
    <SidebarProvider
      className="h-svh min-h-0 flex-col"
      style={{ '--sidebar-width': '292px' } as React.CSSProperties}
    >
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <ModelSidebar />
        <DiagramCanvas />
        <DetailPanel />
      </div>
      <PasteDialog />
    </SidebarProvider>
  )
}
