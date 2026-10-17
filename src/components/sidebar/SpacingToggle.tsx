import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LAYOUT_SPACINGS } from '@/data/layoutOptions'
import { useViewOptions } from '@/hooks/useViewOptions'
import type { LayoutSpacing } from '@/types/view'

export function SpacingToggle() {
  const { options, setSpacing } = useViewOptions()
  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      value={[options.spacing]}
      aria-label="Layout spacing"
      className="mt-2 w-full"
      onValueChange={(value) => {
        const next = value[0] as LayoutSpacing | undefined
        if (next) setSpacing(next)
      }}
    >
      {LAYOUT_SPACINGS.map((s) => (
        <ToggleGroupItem key={s.value} value={s.value} className="flex-1">
          {s.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
