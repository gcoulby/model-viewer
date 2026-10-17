import { ChevronRightIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { VIEW_OPTIONS } from '@/data/viewOptions'
import { DirectionToggle } from './DirectionToggle'
import { LayoutModeSelect } from './LayoutModeSelect'
import { SpacingToggle } from './SpacingToggle'
import { ViewOptionCheckbox } from './ViewOptionCheckbox'

export function ViewOptionsPanel() {
  return (
    <Collapsible defaultOpen className="border-b px-3 pb-2.5">
      <CollapsibleTrigger className="group/trigger flex w-full items-center gap-1 py-1 font-semibold">
        <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-data-[panel-open]/trigger:rotate-90" />
        View
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 grid grid-cols-2 gap-x-2.5 gap-y-1">
          {VIEW_OPTIONS.map((option) => (
            <ViewOptionCheckbox key={option.key} option={option} />
          ))}
        </div>
        <LayoutModeSelect />
        <DirectionToggle />
        <SpacingToggle />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Any change here re-runs the layout. Double-click a box to collapse it.
        </p>
      </CollapsibleContent>
    </Collapsible>
  )
}
