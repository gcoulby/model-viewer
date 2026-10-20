import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ExportButton } from './ExportButton'
import { OpenFilesButton } from './OpenFilesButton'
import { OpenFolderButton } from './OpenFolderButton'
import { PasteButton } from './PasteButton'
import { SampleButton } from './SampleButton'
import { ThemeToggle } from './ThemeToggle'

export function TopBarActions() {
  return (
    <div className="flex flex-none items-center gap-1.5">
      <SidebarTrigger variant="outline" className="md:hidden" />
      <OpenFilesButton />
      <OpenFolderButton />
      <PasteButton />
      <SampleButton />
      <Separator orientation="vertical" className="mx-1 hidden h-5 md:block" />
      <ExportButton format="svg" />
      <ExportButton format="png" />
      <ThemeToggle />
    </div>
  )
}
