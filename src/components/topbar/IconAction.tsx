import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface IconActionProps {
  label: string
  /** Shown after the label in the tooltip, e.g. a shortcut. */
  hint?: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

export function IconAction({ label, hint, disabled, onClick, children }: IconActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon" aria-label={label} disabled={disabled} onClick={onClick} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {hint && <span className="ml-2 text-muted-foreground">{hint}</span>}
      </TooltipContent>
    </Tooltip>
  )
}
