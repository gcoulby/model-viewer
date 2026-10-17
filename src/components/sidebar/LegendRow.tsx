import type { LegendEntry } from '@/data/legend'
import { LegendGlyph } from './LegendGlyph'

export function LegendRow({ entry }: { entry: LegendEntry }) {
  return (
    <>
      <LegendGlyph id={entry.id} />
      <span>{entry.label}</span>
    </>
  )
}
