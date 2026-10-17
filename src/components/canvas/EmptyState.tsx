import { OpenFilesButton } from '@/components/topbar/OpenFilesButton'
import { PasteButton } from '@/components/topbar/PasteButton'
import { SampleButton } from '@/components/topbar/SampleButton'

export function EmptyState() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] grid place-items-center p-6">
      <div className="pointer-events-auto max-w-[430px]">
        <h2 className="mb-2 text-[22px] font-semibold tracking-[-.005em]">Drop an .ecore file here</h2>
        <p className="mb-4 text-muted-foreground">
          Classes, enums, references and inheritance are drawn as a diagram. Files are read in your browser
          and go nowhere else. Load several files at once and cross-file references are joined up.
        </p>
        <div className="flex flex-wrap gap-2">
          <OpenFilesButton />
          <PasteButton />
          <SampleButton label="Try a sample" />
        </div>
      </div>
    </div>
  )
}
