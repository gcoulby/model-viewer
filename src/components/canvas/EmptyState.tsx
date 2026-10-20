import { UploadIcon } from 'lucide-react'
import { OpenFilesButton } from '@/components/topbar/OpenFilesButton'
import { OpenFolderButton } from '@/components/topbar/OpenFolderButton'
import { PasteButton } from '@/components/topbar/PasteButton'
import { SampleButton } from '@/components/topbar/SampleButton'
import { cn } from '@/lib/utils'

/** The welcome screen. A drop anywhere on the canvas loads, so `dropping` only lights up the target. */
export function EmptyState({ dropping }: { dropping: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] grid place-items-center p-6">
      <div className="pointer-events-auto w-full max-w-[470px]">
        <h2 className="mb-2 text-[22px] font-semibold tracking-[-.005em]">Ecore viewer</h2>
        <p className="mb-4 text-muted-foreground">
          Classes, enums, references and inheritance are drawn as a diagram. Files are read in your browser
          and go nowhere else. Load several files, a whole folder or a zip, and cross-file references are
          joined up by their relative paths.
        </p>
        <div
          className={cn(
            'mb-4 grid place-items-center gap-1 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
            dropping ? 'border-primary bg-tint text-foreground' : 'bg-card/60 text-muted-foreground',
          )}
        >
          <UploadIcon className="size-6" />
          <p className="font-medium text-foreground">Drop files here</p>
          <p className="text-[12.5px]">
            <span className="font-mono">.ecore</span> files, a folder, or a <span className="font-mono">.zip</span>{' '}
            of a project. Only the <span className="font-mono">.ecore</span> files inside are read, so a big
            archive is fine.
          </p>
        </div>
        <p className="mb-2 text-[12.5px] text-muted-foreground">Or choose them yourself:</p>
        <div className="flex flex-wrap gap-2">
          <OpenFilesButton />
          <OpenFolderButton />
          <PasteButton />
          <SampleButton label="Try a sample" />
        </div>
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          <strong className="font-medium">Open files</strong> also accepts a <span className="font-mono">.zip</span>.
        </p>
      </div>
    </div>
  )
}
