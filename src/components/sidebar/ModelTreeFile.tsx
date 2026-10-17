import { ChevronRightIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { TreeFile } from '@/lib/ecore/treeModel'
import { ModelTreePackage } from './ModelTreePackage'

export function ModelTreeFile({ file }: { file: TreeFile }) {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="group/trigger flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 font-medium hover:bg-muted">
        <ChevronRightIcon className="size-3.5 text-muted-foreground transition-transform group-data-[panel-open]/trigger:rotate-90" />
        <span className="truncate font-mono text-xs text-muted-foreground">{file.model.fileName}</span>
        <span className="ml-auto font-mono text-[11.5px] font-normal text-muted-foreground">{file.count}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {file.packages.map((pkg) => (
          <ModelTreePackage key={pkg.pkg.id} tree={pkg} model={file.model} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
