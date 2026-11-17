import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useEditorMode } from '@/hooks/useEditorMode'
import { AnalysisActions } from '@/components/analysis/AnalysisActions'
import { EditActions } from './EditActions'
import { ExportButton } from './ExportButton'
import { OpenFilesButton } from './OpenFilesButton'
import { OpenFolderButton } from './OpenFolderButton'
import { PasteButton } from './PasteButton'
import { SampleButton } from './SampleButton'
import { ThemeToggle } from './ThemeToggle'

export function TopBarActions() {
  const { mode } = useEditorMode()
  return (
    <div className="flex flex-none items-center gap-1.5">
      <SidebarTrigger variant="outline" className="md:hidden" />
      {mode === 'analysis' ? (
        <AnalysisActions />
      ) : mode !== 'view' ? (
        <EditActions />
      ) : (
        <>
          <OpenFilesButton />
          <OpenFolderButton />
          <PasteButton />
          <SampleButton />
          <Separator orientation="vertical" className="mx-1 hidden h-5 md:block" />
          <ExportButton format="svg" />
          <ExportButton format="png" />
        </>
      )}
      <ThemeToggle />
    </div>
  )
}
