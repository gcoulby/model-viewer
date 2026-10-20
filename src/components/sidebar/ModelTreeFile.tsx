import { ChevronRightIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { TreeFile } from '@/lib/ecore/treeModel'
import { FileColorPicker } from './FileColorPicker'
import { ModelTreePackage } from './ModelTreePackage'

export function ModelTreeFile({ file }: { file: TreeFile }) {
  return (
    <Collapsible defaultOpen>
      <div className="flex items-center">
        <CollapsibleTrigger
          title={file.model.fileName}
          className="group/trigger flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 font-medium hover:bg-muted"
        >
          <ChevronRightIcon className="size-3.5 flex-none text-muted-foreground transition-transform group-data-[panel-open]/trigger:rotate-90" />
          <span className="truncate font-mono text-xs text-muted-foreground">{file.model.fileName}</span>
          <span className="ml-auto font-mono text-[11.5px] font-normal text-muted-foreground">{file.count}</span>
        </CollapsibleTrigger>
        <FileColorPicker fileKey={file.model.key} fileName={file.model.fileName} />
      </div>
      <CollapsibleContent>
        {file.packages.map((pkg) => (
          <ModelTreePackage key={pkg.pkg.id} tree={pkg} model={file.model} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
