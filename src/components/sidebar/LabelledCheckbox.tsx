import { useId } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface LabelledCheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  title?: string
}

export function LabelledCheckbox({ label, checked, onChange, title }: LabelledCheckboxProps) {
  const id = useId()
  return (
    <div className="flex items-center gap-1.5" title={title}>
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-[12.5px] font-normal">
        {label}
      </Label>
    </div>
  )
}
