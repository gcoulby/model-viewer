import { ReactFlowProvider } from '@xyflow/react'
import { AppShell } from '@/components/shell/AppShell'
import { DiagramProvider } from '@/components/providers/DiagramProvider'
import { FileColorsProvider } from '@/components/providers/FileColorsProvider'
import { ModelsProvider } from '@/components/providers/ModelsProvider'
import { PortsProvider } from '@/components/providers/PortsProvider'
import { PasteDialogProvider } from '@/components/providers/PasteDialogProvider'
import { ScopeProvider } from '@/components/providers/ScopeProvider'
import { SelectionProvider } from '@/components/providers/SelectionProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ViewOptionsProvider } from '@/components/providers/ViewOptionsProvider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <FileColorsProvider>
        <ModelsProvider>
          <ViewOptionsProvider>
            <SelectionProvider>
              <ScopeProvider>
              <PortsProvider>
              <DiagramProvider>
                <PasteDialogProvider>
                  <ReactFlowProvider>
                    <AppShell />
                  </ReactFlowProvider>
                </PasteDialogProvider>
              </DiagramProvider>
              </PortsProvider>
              </ScopeProvider>
            </SelectionProvider>
          </ViewOptionsProvider>
        </ModelsProvider>
        </FileColorsProvider>
      </TooltipProvider>
      <Toaster />
    </ThemeProvider>
  )
}
