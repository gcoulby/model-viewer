import { OpenFilesButton } from '@/components/topbar/OpenFilesButton'
import { OpenFolderButton } from '@/components/topbar/OpenFolderButton'
import { PasteButton } from '@/components/topbar/PasteButton'
import { SampleButton } from '@/components/topbar/SampleButton'

export function EmptyState() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] grid place-items-center p-6">
      <div className="pointer-events-auto max-w-[430px]">
        <h2 className="mb-2 text-[22px] font-semibold tracking-[-.005em]">Drop .ecore files or a folder here</h2>
        <p className="mb-4 text-muted-foreground">
          Classes, enums, references and inheritance are drawn as a diagram. Files are read in your browser
          and go nowhere else. Load several files, or a whole folder, and cross-file references are joined up by their relative paths.
        </p>
        <div className="flex flex-wrap gap-2">
          <OpenFilesButton />
          <OpenFolderButton />
          <PasteButton />
          <SampleButton label="Try a sample" />
        </div>
      </div>
    </div>
  )
}
