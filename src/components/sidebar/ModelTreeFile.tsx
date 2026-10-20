import { ChevronRightIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useModels } from '@/hooks/useModels'
import { useTreeOpen } from '@/hooks/useTreeOpen'
import type { TreeFile } from '@/lib/ecore/treeModel'
import { FileColorPicker } from './FileColorPicker'
import { ModelTreePackage } from './ModelTreePackage'
import { ModelTreePackageContents } from './ModelTreePackageContents'

/** A loaded file, named by its package with the file's path beneath. */
export function ModelTreeFile({ file }: { file: TreeFile }) {
  const { removeModel } = useModels()
  const { isOpen, setOpen } = useTreeOpen()
  const { model, packages } = file
  const title = model.roots.map((r) => r.name).join(', ')
  // One root package is the file's name already, so its contents sit directly under the file.
  const single = packages.length === 1 ? packages[0] : undefined

  return (
    <Collapsible open={isOpen(model.key)} onOpenChange={(open) => setOpen(model.key, open)}>
      <div className="flex items-center">
        <CollapsibleTrigger
          title={model.fileName}
          className="group/trigger flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-left font-medium hover:bg-muted"
        >
          <ChevronRightIcon className="size-3.5 flex-none text-muted-foreground transition-transform group-data-[panel-open]/trigger:rotate-90" />
          <span className="min-w-0 flex-1">
            <span className="block truncate">{title}</span>
            <span className="block truncate font-mono text-[11px] font-normal text-muted-foreground">
              {model.fileName}
            </span>
          </span>
          <span className="font-mono text-[11.5px] font-normal text-muted-foreground">{file.count}</span>
        </CollapsibleTrigger>
        <FileColorPicker fileKey={model.key} fileName={model.fileName} />
        <Button
          variant="ghost"
          size="icon-xs"
          className="size-6 text-muted-foreground"
          aria-label={`Close ${model.fileName}`}
          title="Close file"
          onClick={() => removeModel(model.key)}
        >
          <XIcon />
        </Button>
      </div>
      <CollapsibleContent className="ml-3">
        {single ? (
          <ModelTreePackageContents tree={single} model={model} />
        ) : (
          packages.map((pkg) => <ModelTreePackage key={pkg.pkg.id} tree={pkg} model={model} />)
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
