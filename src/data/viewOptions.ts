import type { ViewOptions } from '@/types/view'

export type ToggleOptionKey = Exclude<keyof ViewOptions, 'direction'>

export interface ViewOptionDefinition {
  key: ToggleOptionKey
  label: string
  defaultValue: boolean
}

export const VIEW_OPTIONS: ViewOptionDefinition[] = [
  { key: 'attributes', label: 'Attributes', defaultValue: true },
  { key: 'operations', label: 'Operations', defaultValue: false },
  { key: 'inheritance', label: 'Inheritance', defaultValue: true },
  { key: 'references', label: 'References', defaultValue: true },
  { key: 'enums', label: 'Enums', defaultValue: true },
  { key: 'enumLinks', label: 'Enum links', defaultValue: true },
  { key: 'dataTypes', label: 'Data types', defaultValue: false },
  { key: 'external', label: 'External types', defaultValue: true },
]
