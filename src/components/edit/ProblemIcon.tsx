import { CircleAlertIcon, TriangleAlertIcon } from 'lucide-react'
import type { Severity } from '@/lib/ecore/edit/validate'
import { cn } from '@/lib/utils'

export function ProblemIcon({ severity, className }: { severity: Severity; className?: string }) {
  const Icon = severity === 'error' ? CircleAlertIcon : TriangleAlertIcon
  return (
    <Icon
      aria-label={severity === 'error' ? 'Error' : 'Warning'}
      className={cn('size-3.5 flex-none', severity === 'error' ? 'text-destructive' : 'text-warning', className)}
    />
  )
}
