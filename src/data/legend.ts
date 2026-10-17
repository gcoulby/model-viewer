export type LegendId = 'inherit' | 'containment' | 'reference' | 'opposite' | 'enumLink'

export interface LegendEntry {
  id: LegendId
  label: string
}

export const LEGEND: LegendEntry[] = [
  { id: 'inherit', label: 'Inheritance' },
  { id: 'containment', label: 'Containment' },
  { id: 'reference', label: 'One-way reference' },
  { id: 'opposite', label: 'Reference with opposite' },
  { id: 'enumLink', label: 'Attribute typed by an enum' },
]
