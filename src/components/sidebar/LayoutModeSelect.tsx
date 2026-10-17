import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LAYOUT_MODES } from '@/data/layoutOptions'
import { useViewOptions } from '@/hooks/useViewOptions'
import type { LayoutMode } from '@/types/view'

const ITEMS = LAYOUT_MODES.map(({ value, label }) => ({ value, label }))

export function LayoutModeSelect() {
  const { options, setLayoutMode } = useViewOptions()
  const current = LAYOUT_MODES.find((m) => m.value === options.layoutMode)
  return (
    <div className="mt-2">
      <Select
        value={options.layoutMode}
        items={ITEMS}
        onValueChange={(value) => value && setLayoutMode(value as LayoutMode)}
      >
        <SelectTrigger size="sm" className="w-full" aria-label="Layout">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LAYOUT_MODES.map((mode) => (
            <SelectItem key={mode.value} value={mode.value}>
              {mode.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {current && <p className="mt-1 text-xs text-muted-foreground">{current.description}</p>}
    </div>
  )
}
