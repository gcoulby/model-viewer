import { Button } from '@/components/ui/button'
import { PORT_MODES } from '@/data/layoutOptions'
import { usePorts } from '@/hooks/usePorts'
import { useViewOptions } from '@/hooks/useViewOptions'
import { SegmentedControl } from './SegmentedControl'

export function PortsControl() {
  const { display, setDisplay } = useViewOptions()
  const { overrides, reset } = usePorts()
  return (
    <div>
      <SegmentedControl
        label="Draw links as ports"
        value={display.ports}
        choices={PORT_MODES}
        onChange={(v) => setDisplay('ports', v)}
      />
      <p className="mt-1 text-xs text-muted-foreground">
        Click a link to port it on its own. Click a port tag to jump to the other end.
      </p>
      {overrides.size > 0 && (
        <Button variant="link" size="xs" className="h-auto px-0" onClick={reset}>
          Clear {overrides.size} set by hand
        </Button>
      )}
    </div>
  )
}
