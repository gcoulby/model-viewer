import { Button } from '@/components/ui/button'
import { useDiagram } from '@/hooks/useDiagram'
import { usePorts } from '@/hooks/usePorts'

interface PortControlsProps {
  edgeId: string
  /** Whether the link is drawn as port tags right now. */
  ported: boolean
}

/** Ports one link, or draws it as a line again, and offers the re-layout that separates the parts. */
export function PortControls({ edgeId, ported }: PortControlsProps) {
  const { overrides, setPorted } = usePorts()
  const { layoutStale, relayout } = useDiagram()
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setPorted(edgeId, !ported)}>
        {ported ? 'Draw as a line' : 'Port this link'}
      </Button>
      {overrides.has(edgeId) && (
        <span className="text-xs text-muted-foreground">Set by hand, whatever the Ports setting says.</span>
      )}
      {layoutStale && (
        <Button size="sm" onClick={relayout} title="Lay out again without the ported links, so the parts they join sit apart">
          Re-layout
        </Button>
      )}
    </div>
  )
}
