import { Panel } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useScope } from '@/hooks/useScope'

/** Says when the diagram is narrowed to one package or has hidden packages, and undoes it. */
export function ScopeBanner() {
  const { focus, hidden, clearFocus, setIncludeLinked, showHidden } = useScope()
  if (!focus && !hidden.size) return null
  return (
    <Panel position="top-center" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-card py-1 pr-1 pl-3 text-xs">
      {focus && (
        <>
          <span>
            Showing only <strong className="font-mono font-medium">{focus.label}</strong>
          </span>
          <Label className="gap-1.5 text-xs font-normal">
            <Checkbox checked={focus.includeLinked} onCheckedChange={(checked) => setIncludeLinked(checked === true)} />
            Include linked types
          </Label>
          <Button variant="ghost" size="xs" onClick={clearFocus}>
            Show all
          </Button>
        </>
      )}
      {hidden.size > 0 && (
        <>
          <span className="text-muted-foreground">{hidden.size} hidden</span>
          <Button variant="ghost" size="xs" onClick={showHidden}>
            Show hidden
          </Button>
        </>
      )}
    </Panel>
  )
}
