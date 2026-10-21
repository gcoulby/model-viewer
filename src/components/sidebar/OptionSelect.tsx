import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Choice } from '@/data/layoutOptions'

interface OptionSelectProps<T extends string> {
  label: string
  value: T
  choices: Choice<T>[]
  onChange: (value: T) => void
}

/** A select over a fixed list of choices, with the picked choice's description underneath. */
export function OptionSelect<T extends string>({ label, value, choices, onChange }: OptionSelectProps<T>) {
  const current = choices.find((c) => c.value === value)
  return (
    <div>
      <Select
        value={value}
        items={choices.map(({ value: v, label: l }) => ({ value: v, label: l }))}
        onValueChange={(next) => {
          const picked = choices.find((c) => c.value === next)
          if (picked) onChange(picked.value)
        }}
      >
        <SelectTrigger size="sm" className="w-full" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {choices.map((choice) => (
            <SelectItem key={choice.value} value={choice.value}>
              {choice.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {current?.description && <p className="mt-1 text-xs text-muted-foreground">{current.description}</p>}
    </div>
  )
}
