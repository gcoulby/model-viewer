import { ChevronsDownUpIcon, ChevronsUpDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useModels } from '@/hooks/useModels'
import { useTreeOpen } from '@/hooks/useTreeOpen'

export function ModelTreeToolbar() {
  const { models } = useModels()
  const { expandAll, collapseAll } = useTreeOpen()
  if (!models.length) return null
  return (
    <div className="flex items-center gap-1 border-t px-3 py-1">
      <span className="text-xs font-medium text-muted-foreground">
        Files <span className="font-mono font-normal">{models.length}</span>
      </span>
      <div className="flex-1" />
      <Button variant="ghost" size="icon-xs" aria-label="Expand all" title="Expand all" onClick={expandAll}>
        <ChevronsUpDownIcon />
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label="Collapse all" title="Collapse all" onClick={collapseAll}>
        <ChevronsDownUpIcon />
      </Button>
    </div>
  )
}
