import { Button } from '@/components/ui/button'
import { PORT_MODES } from '@/data/layoutOptions'
import { usePorts } from '@/hooks/usePorts'
import { useViewOptions } from '@/hooks/useViewOptions'
import { LabelledCheckbox } from './LabelledCheckbox'
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
      <div className="mt-1.5">
        <LabelledCheckbox
          label="Lay out for ports"
          title="Outgoing tags go on one side of each box and incoming tags on the other, and boxes are spaced so no tag covers a box or another tag. With every link ported, boxes are packed closer, as there are no lines to make room for."
          checked={display.portRoom}
          onChange={(v) => setDisplay('portRoom', v)}
        />
      </div>
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
