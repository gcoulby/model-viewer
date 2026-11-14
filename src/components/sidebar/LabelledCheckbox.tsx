import { useId } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface LabelledCheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  title?: string
  disabled?: boolean
}

export function LabelledCheckbox({ label, checked, onChange, title, disabled }: LabelledCheckboxProps) {
  const id = useId()
  return (
    <div className="flex items-center gap-1.5" title={title}>
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
      <Label htmlFor={id} className={disabled ? "text-[12.5px] font-normal text-muted-foreground" : "text-[12.5px] font-normal"}>
        {label}
      </Label>
    </div>
  )
}
