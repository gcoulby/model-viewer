import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ParsedModel } from '@/types/ecore'

interface FileChipProps {
  model: ParsedModel
  onRemove: (key: string) => void
}

export function FileChip({ model, onRemove }: FileChipProps) {
  return (
    <span
      title={model.fileName}
      className="inline-flex max-w-[200px] items-center gap-1 rounded-md border bg-muted py-0.5 pr-0.5 pl-2 font-mono text-xs"
    >
      <span className="truncate">{model.fileName}</span>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Remove ${model.fileName}`}
        onClick={() => onRemove(model.key)}
        className="size-5 text-muted-foreground"
      >
        <XIcon />
      </Button>
    </span>
  )
}
