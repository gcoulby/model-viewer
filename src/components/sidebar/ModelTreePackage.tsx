import { ChevronRightIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useTheme } from '@/hooks/useTheme'
import { packageDotColor } from '@/lib/ecore/paint'
import { packageInfoOf, type TreePackage } from '@/lib/ecore/treeModel'
import type { ParsedModel } from '@/types/ecore'
import { ModelTreeItem } from './ModelTreeItem'

interface ModelTreePackageProps {
  tree: TreePackage
  model: ParsedModel
}

export function ModelTreePackage({ tree, model }: ModelTreePackageProps) {
  const { theme } = useTheme()
  const dot = packageDotColor(packageInfoOf(tree.pkg, model), theme === 'dark')
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="group/trigger flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 font-medium hover:bg-muted">
        <ChevronRightIcon className="size-3.5 text-muted-foreground transition-transform group-data-[panel-open]/trigger:rotate-90" />
        <i className="size-[9px] flex-none rounded-full" style={{ background: dot }} />
        <span className="truncate">{tree.pkg.name}</span>
        <span className="ml-auto font-mono text-[11.5px] font-normal text-muted-foreground">{tree.count}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-3">
        {tree.classifiers.map((classifier) => (
          <ModelTreeItem key={classifier.id} classifier={classifier} />
        ))}
        {tree.subpackages.map((sub) => (
          <ModelTreePackage key={sub.pkg.id} tree={sub} model={model} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
