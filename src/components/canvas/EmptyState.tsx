import { UploadIcon } from 'lucide-react'
import { OpenFilesButton } from '@/components/topbar/OpenFilesButton'
import { OpenFolderButton } from '@/components/topbar/OpenFolderButton'
import { PasteButton } from '@/components/topbar/PasteButton'
import { SampleButton } from '@/components/topbar/SampleButton'
import { Button } from '@/components/ui/button'
import { useEditorMode } from '@/hooks/useEditorMode'
import { useModels } from '@/hooks/useModels'
import { NewInstanceButton } from '@/components/instance/NewInstanceButton'
import { cn } from '@/lib/utils'

/** The welcome screen. A drop anywhere on the canvas loads, so `dropping` only lights up the target. */
export function EmptyState({ dropping }: { dropping: boolean }) {
  const { mode } = useEditorMode()
  const { createModel, models } = useModels()
  if (mode === 'instance' && models.length) return <InstanceEmptyState />
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] grid place-items-center p-6">
      <div className="pointer-events-auto w-full max-w-[470px]">
        <h2 className="mb-2 text-[22px] font-semibold tracking-[-.005em]">Ecore Studio</h2>
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
          {mode === 'edit' && <Button onClick={() => createModel()}>New model</Button>}
          <OpenFilesButton variant={mode === 'edit' ? 'outline' : 'default'} />
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

/** Instance mode with metamodels open but no instance yet: the one thing to do is start one. */
function InstanceEmptyState() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] grid place-items-center p-6">
      <div className="pointer-events-auto w-full max-w-[470px]">
        <h2 className="mb-2 text-[22px] font-semibold tracking-[-.005em]">Make an instance</h2>
        <p className="mb-4 text-muted-foreground">
          An instance is a model built from the classes of your metamodel: objects with values, linked by its
          references. Start from a root class, then add objects inside it from the tree or the Properties panel.
          It saves as an <span className="font-mono">.xmi</span> file that Eclipse opens too.
        </p>
        <div className="flex flex-wrap gap-2">
          <NewInstanceButton variant="default" />
          <OpenFilesButton variant="outline" />
        </div>
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          <strong className="font-medium">Open files</strong> also opens an existing <span className="font-mono">.xmi</span> instance.
        </p>
      </div>
    </div>
  )
}
