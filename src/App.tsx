import { ReactFlowProvider } from '@xyflow/react'
import { AppShell } from '@/components/shell/AppShell'
import { DiagramProvider } from '@/components/providers/DiagramProvider'
import { ModelsProvider } from '@/components/providers/ModelsProvider'
import { PasteDialogProvider } from '@/components/providers/PasteDialogProvider'
import { SelectionProvider } from '@/components/providers/SelectionProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ViewOptionsProvider } from '@/components/providers/ViewOptionsProvider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <ModelsProvider>
          <ViewOptionsProvider>
            <SelectionProvider>
              <DiagramProvider>
                <PasteDialogProvider>
                  <ReactFlowProvider>
                    <AppShell />
                  </ReactFlowProvider>
                </PasteDialogProvider>
              </DiagramProvider>
            </SelectionProvider>
          </ViewOptionsProvider>
        </ModelsProvider>
      </TooltipProvider>
      <Toaster />
    </ThemeProvider>
  )
}
