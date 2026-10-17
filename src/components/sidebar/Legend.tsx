import { LEGEND } from '@/data/legend'
import { LegendRow } from './LegendRow'

export function Legend() {
  return (
    <div
      aria-label="Legend"
      className="grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-1.5 border-t px-3 py-2.5 text-xs text-muted-foreground"
    >
      {LEGEND.map((entry) => (
        <LegendRow key={entry.id} entry={entry} />
      ))}
    </div>
  )
}
