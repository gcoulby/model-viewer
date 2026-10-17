import type { LayoutMode, LayoutSpacing } from '@/types/view'

export interface LayoutModeDefinition {
  value: LayoutMode
  label: string
  description: string
}

export const LAYOUT_MODES: LayoutModeDefinition[] = [
  { value: 'layered', label: 'Layered (all links)', description: 'Every visible link shapes the layout.' },
  {
    value: 'structure',
    label: 'Inheritance and containment',
    description: 'Only inheritance and containment shape the layout.',
  },
  { value: 'inheritance', label: 'Inheritance only', description: 'Only inheritance shapes the layout.' },
  { value: 'grid', label: 'Grid by package', description: 'No hierarchy; boxes are grouped by package.' },
]

export const LAYOUT_SPACINGS: { value: LayoutSpacing; label: string; factor: number }[] = [
  { value: 'compact', label: 'Compact', factor: 0.6 },
  { value: 'normal', label: 'Normal', factor: 1 },
  { value: 'spacious', label: 'Spacious', factor: 1.5 },
]
