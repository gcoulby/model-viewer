import { ChevronRightIcon, LoaderCircleIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  EDGE_ROUTINGS,
  LAYOUT_ALGORITHMS,
  LAYOUT_DIRECTIONS,
  LAYOUT_GROUPINGS,
  LAYOUT_MODES,
  LAYOUT_SPACINGS,
  OTHER_LINKS,
} from '@/data/layoutOptions'
import { useDiagram } from '@/hooks/useDiagram'
import { useViewOptions } from '@/hooks/useViewOptions'
import { DirectionIcon } from './DirectionIcon'
import { LabelledCheckbox } from './LabelledCheckbox'
import { OptionSelect } from './OptionSelect'
import { SegmentedControl } from './SegmentedControl'
import { SettingRow } from './SettingRow'

export function LayoutPanel() {
  const { options, display, setLayout, setDisplay } = useViewOptions()
  const { layoutPending } = useDiagram()
  const algorithm = LAYOUT_ALGORITHMS.find((a) => a.value === options.algorithm)
  const linked = algorithm?.linked ?? true
  const someLinksFree = !linked || options.layoutMode !== 'layered'

  return (
    <Collapsible defaultOpen className="border-b px-3 pb-2.5">
      <CollapsibleTrigger className="group/trigger flex w-full items-center gap-1 py-1 font-semibold">
        <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-data-[panel-open]/trigger:rotate-90" />
        Layout
        {layoutPending && (
          <LoaderCircleIcon aria-label="Laying out" className="ml-auto size-3.5 animate-spin text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SettingRow label="Algorithm">
          <OptionSelect
            label="Layout algorithm"
            value={options.algorithm}
            choices={LAYOUT_ALGORITHMS}
            onChange={(v) => setLayout('algorithm', v)}
          />
        </SettingRow>
        {linked && (
          <SettingRow label="Arrange by">
            <OptionSelect
              label="Links that shape the layout"
              value={options.layoutMode}
              choices={LAYOUT_MODES}
              onChange={(v) => setLayout('layoutMode', v)}
            />
            {options.layoutMode !== 'layered' && (
              <div className="mt-1.5">
                <LabelledCheckbox
                  label="Place strays by their other links"
                  title="Boxes the chosen links do not reach are placed by all their links, beside what they relate to"
                  checked={options.pullIn}
                  onChange={(v) => setLayout('pullIn', v)}
                />
              </div>
            )}
          </SettingRow>
        )}
        {algorithm?.directed && (
          <SettingRow label="Direction">
            <SegmentedControl
              label="Layout direction"
              value={options.direction}
              choices={LAYOUT_DIRECTIONS}
              onChange={(v) => setLayout('direction', v)}
              renderItem={(c) => <DirectionIcon direction={c.value} />}
            />
          </SettingRow>
        )}
        <SettingRow label="Frames">
          <SegmentedControl
            label="Group boxes by"
            value={options.grouping}
            choices={LAYOUT_GROUPINGS}
            onChange={(v) => setLayout('grouping', v)}
          />
        </SettingRow>
        <SettingRow label="Spacing">
          <SegmentedControl
            label="Layout spacing"
            value={options.spacing}
            choices={LAYOUT_SPACINGS}
            onChange={(v) => setLayout('spacing', v)}
          />
        </SettingRow>
        <SettingRow label="Lines">
          <SegmentedControl
            label="Line style"
            value={display.routing}
            choices={EDGE_ROUTINGS}
            onChange={(v) => setDisplay('routing', v)}
          />
        </SettingRow>
        {someLinksFree && (
          <SettingRow label="Links that do not shape the layout">
            <SegmentedControl
              label="Show other links"
              value={display.otherLinks}
              choices={OTHER_LINKS}
              onChange={(v) => setDisplay('otherLinks', v)}
            />
          </SettingRow>
        )}
        <div className="mt-2">
          <LabelledCheckbox label="Link labels" checked={display.labels} onChange={(v) => setDisplay('labels', v)} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
