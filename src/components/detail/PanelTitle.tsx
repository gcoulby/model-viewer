import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PanelTitleProps {
  title: string
  /** Muted lines under the title; empty ones are skipped. */
  lines: (string | null | undefined)[]
  onClose: () => void
}

export function PanelTitle({ title, lines, onClose }: PanelTitleProps) {
  return (
    <div>
      <div className="flex items-start gap-2">
        <h2 className="flex-1 text-[19px] leading-tight font-semibold break-words">{title}</h2>
        <Button variant="ghost" size="icon-sm" aria-label="Close details" onClick={onClose}>
          <XIcon />
        </Button>
      </div>
      {lines.filter(Boolean).map((line, i) => (
        <p key={i} className="mt-0.5 text-[12.5px] break-words text-muted-foreground">
          {line}
        </p>
      ))}
    </div>
  )
}
