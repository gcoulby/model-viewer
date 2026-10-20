import { ChevronRightIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useFileColors } from '@/hooks/useFileColors'
import { useTheme } from '@/hooks/useTheme'
import { useTreeOpen } from '@/hooks/useTreeOpen'
import { dotColor } from '@/lib/ecore/paint'
import type { TreePackage } from '@/lib/ecore/treeModel'
import type { ParsedModel } from '@/types/ecore'
import { ModelTreePackageContents } from './ModelTreePackageContents'

interface ModelTreePackageProps {
  tree: TreePackage
  model: ParsedModel
}

export function ModelTreePackage({ tree, model }: ModelTreePackageProps) {
  const { theme } = useTheme()
  const { hueFor } = useFileColors()
  const { isOpen, setOpen } = useTreeOpen()
  const dot = dotColor(hueFor(model.key), theme === 'dark')
  return (
    <Collapsible open={isOpen(tree.pkg.id)} onOpenChange={(open) => setOpen(tree.pkg.id, open)}>
      <CollapsibleTrigger className="group/trigger flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left font-medium hover:bg-muted">
        <ChevronRightIcon className="size-3.5 flex-none text-muted-foreground transition-transform group-data-[panel-open]/trigger:rotate-90" />
        <i className="size-[9px] flex-none rounded-full" style={{ background: dot }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate">{tree.pkg.name}</span>
          <span className="block truncate font-mono text-[11px] font-normal text-muted-foreground">
            {tree.pkg.fullName}
          </span>
        </span>
        <span className="font-mono text-[11.5px] font-normal text-muted-foreground">{tree.count}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-3">
        <ModelTreePackageContents tree={tree} model={model} />
      </CollapsibleContent>
    </Collapsible>
  )
}
