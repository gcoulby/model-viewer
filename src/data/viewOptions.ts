import { DEFAULT_LAYOUT } from './layoutOptions'
import type { ViewOptions } from '@/types/view'

export type ToggleOptionKey = {
  [K in keyof ViewOptions]: ViewOptions[K] extends boolean ? K : never
}[keyof ViewOptions]

export interface ViewOptionDefinition {
  key: Exclude<ToggleOptionKey, 'pullIn'>
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

export function defaultViewOptions(): ViewOptions {
  const toggles = Object.fromEntries(VIEW_OPTIONS.map((o) => [o.key, o.defaultValue])) as Record<
    Exclude<ToggleOptionKey, 'pullIn'>,
    boolean
  >
  return { ...toggles, ...DEFAULT_LAYOUT }
}
