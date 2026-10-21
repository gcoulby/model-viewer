import type { ReactNode } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Choice } from '@/data/layoutOptions'

interface SegmentedControlProps<T extends string> {
  label: string
  /** Null when none of the choices describes the current state. */
  value: T | null
  choices: Choice<T>[]
  onChange: (value: T) => void
  /** Draws an item's content in place of its label, which then becomes its tooltip. */
  renderItem?: (choice: Choice<T>) => ReactNode
}

export function SegmentedControl<T extends string>({
  label,
  value,
  choices,
  onChange,
  renderItem,
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      spacing={0}
      value={value === null ? [] : [value]}
      aria-label={label}
      className="w-full"
      onValueChange={(next) => {
        const picked = choices.find((c) => c.value === next[0])
        if (picked) onChange(picked.value)
      }}
    >
      {choices.map((choice) => (
        <ToggleGroupItem
          key={choice.value}
          value={choice.value}
          aria-label={choice.label}
          title={choice.description ?? (renderItem ? choice.label : undefined)}
          className="flex-1 px-1.5 text-xs"
        >
          {renderItem ? renderItem(choice) : choice.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
