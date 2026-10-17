import { useId } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { ViewOptionDefinition } from '@/data/viewOptions'
import { useViewOptions } from '@/hooks/useViewOptions'

export function ViewOptionCheckbox({ option }: { option: ViewOptionDefinition }) {
  const id = useId()
  const { options, setOption } = useViewOptions()
  return (
    <div className="flex items-center gap-1.5">
      <Checkbox
        id={id}
        checked={options[option.key]}
        onCheckedChange={(checked) => setOption(option.key, checked)}
      />
      <Label htmlFor={id} className="text-[12.5px] font-normal">
        {option.label}
      </Label>
    </div>
  )
}
