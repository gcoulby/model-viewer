import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useViewOptions } from '@/hooks/useViewOptions'
import type { LayoutDirection } from '@/types/view'

export function DirectionToggle() {
  const { options, setDirection } = useViewOptions()
  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      value={[options.direction]}
      aria-label="Layout direction"
      className="mt-2 w-full"
      onValueChange={(value) => {
        const next = value[0] as LayoutDirection | undefined
        if (next) setDirection(next)
      }}
    >
      <ToggleGroupItem value="TB" className="flex-1">
        Top down
      </ToggleGroupItem>
      <ToggleGroupItem value="LR" className="flex-1">
        Left to right
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
