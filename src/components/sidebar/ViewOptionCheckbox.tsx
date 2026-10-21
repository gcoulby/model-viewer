import type { ViewOptionDefinition } from '@/data/viewOptions'
import { useViewOptions } from '@/hooks/useViewOptions'
import { LabelledCheckbox } from './LabelledCheckbox'

export function ViewOptionCheckbox({ option }: { option: ViewOptionDefinition }) {
  const { options, setOption } = useViewOptions()
  return (
    <LabelledCheckbox
      label={option.label}
      checked={options[option.key]}
      onChange={(checked) => setOption(option.key, checked)}
    />
  )
}
