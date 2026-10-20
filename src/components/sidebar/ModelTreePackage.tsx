import { ChevronRightIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useFileColors } from '@/hooks/useFileColors'
import { useScope } from '@/hooks/useScope'
import { useTheme } from '@/hooks/useTheme'
import { useTreeOpen } from '@/hooks/useTreeOpen'
import { dotColor } from '@/lib/ecore/paint'
import { packageScopeIds } from '@/lib/ecore/scope'
import type { TreePackage } from '@/lib/ecore/treeModel'
import { cn } from '@/lib/utils'
import type { ParsedModel } from '@/types/ecore'
import { ModelTreePackageContents } from './ModelTreePackageContents'
import { PackageVisibilityButton } from './PackageVisibilityButton'

interface ModelTreePackageProps {
  tree: TreePackage
  model: ParsedModel
}

export function ModelTreePackage({ tree, model }: ModelTreePackageProps) {
  const { theme } = useTheme()
  const { hueFor } = useFileColors()
  const { isOpen, setOpen } = useTreeOpen()
  const { focus, hidden, focusOn } = useScope()
  const ids = packageScopeIds(model, tree.pkg)
  const dot = dotColor(hueFor(model.key), theme === 'dark')
  const focused = !!focus && ids.length === focus.ids.size && ids.every((id) => focus.ids.has(id))
  const isHidden = ids.every((id) => hidden.has(id))

  return (
    <Collapsible open={isOpen(tree.pkg.id)} onOpenChange={(open) => setOpen(tree.pkg.id, open)}>
      <div className={cn('flex items-center rounded-md', focused && 'bg-tint', isHidden && 'opacity-50')}>
        <CollapsibleTrigger
          aria-label={`Expand or collapse ${tree.pkg.name}`}
          className="group/trigger flex-none rounded-md p-1 hover:bg-muted"
        >
          <ChevronRightIcon className="size-3.5 text-muted-foreground transition-transform group-data-[panel-open]/trigger:rotate-90" />
        </CollapsibleTrigger>
        <button
          type="button"
          title="Show only this package"
          onClick={() => focusOn(ids, tree.pkg.fullName)}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1 text-left font-medium hover:bg-muted"
        >
          <i className="size-[9px] flex-none rounded-full" style={{ background: dot }} />
          <span className="min-w-0 flex-1">
            <span className="block truncate">{tree.pkg.name}</span>
            <span className="block truncate font-mono text-[11px] font-normal text-muted-foreground">
              {tree.pkg.fullName}
            </span>
          </span>
          <span className="font-mono text-[11.5px] font-normal text-muted-foreground">{tree.count}</span>
        </button>
        <PackageVisibilityButton ids={ids} name={tree.pkg.fullName} />
      </div>
      <CollapsibleContent className="ml-3">
        <ModelTreePackageContents tree={tree} model={model} />
      </CollapsibleContent>
    </Collapsible>
  )
}
