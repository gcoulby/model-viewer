import type {
  EdgeDisplay,
  EdgeRouting,
  LayoutAlgorithm,
  LayoutDirection,
  LayoutGrouping,
  LayoutMode,
  LayoutSettings,
  LayoutSpacing,
  OtherLinks,
  PortMode,
} from '@/types/view'

export interface Choice<T extends string> {
  value: T
  label: string
  description?: string
}

export interface LayoutAlgorithmDefinition extends Choice<LayoutAlgorithm> {
  description: string
  /** The direction setting means something to this algorithm. */
  directed: boolean
  /** Links shape the result, so the "Arrange by" setting applies. */
  linked: boolean
}

export const LAYOUT_ALGORITHMS: LayoutAlgorithmDefinition[] = [
  {
    value: 'layered',
    label: 'Layered',
    description: 'Rows of boxes with few crossings, and links routed around boxes. Best all-rounder.',
    directed: true,
    linked: true,
  },
  {
    value: 'dagre',
    label: 'Layered (classic)',
    description: 'The quicker, simpler layered layout. Can sprawl on big models.',
    directed: true,
    linked: true,
  },
  {
    value: 'tree',
    label: 'Tree',
    description: 'Each box under one parent, as a tidy tree. Pairs well with "Inheritance only".',
    directed: true,
    linked: true,
  },
  {
    value: 'stress',
    label: 'Stress',
    description: 'Linked boxes sit close together at even distances. Good for reference-heavy models.',
    directed: false,
    linked: true,
  },
  {
    value: 'force',
    label: 'Force',
    description: 'An organic layout where links pull and boxes push apart.',
    directed: false,
    linked: true,
  },
  {
    value: 'radial',
    label: 'Radial',
    description: 'Rings around a root box, one ring per step away from it.',
    directed: false,
    linked: true,
  },
  {
    value: 'grid',
    label: 'Packed grid',
    description: 'Boxes packed tightly in name order, ignoring links. Group by package for an index.',
    directed: false,
    linked: false,
  },
]

export const LAYOUT_MODES: Choice<LayoutMode>[] = [
  { value: 'layered', label: 'All links', description: 'Every visible link shapes the layout.' },
  {
    value: 'structure',
    label: 'Inheritance and containment',
    description: 'Only inheritance and containment shape the layout.',
  },
  { value: 'inheritance', label: 'Inheritance only', description: 'Only inheritance shapes the layout.' },
]

export const LAYOUT_DIRECTIONS: Choice<LayoutDirection>[] = [
  { value: 'TB', label: 'Top down' },
  { value: 'BT', label: 'Bottom up' },
  { value: 'LR', label: 'Left to right' },
  { value: 'RL', label: 'Right to left' },
]

export const LAYOUT_GROUPINGS: Choice<LayoutGrouping>[] = [
  { value: 'none', label: 'None' },
  { value: 'file', label: 'File' },
  { value: 'package', label: 'Package' },
]

export const LAYOUT_SPACINGS: (Choice<LayoutSpacing> & { factor: number })[] = [
  { value: 'compact', label: 'Compact', factor: 0.6 },
  { value: 'normal', label: 'Normal', factor: 1 },
  { value: 'spacious', label: 'Spacious', factor: 1.5 },
]

export const EDGE_ROUTINGS: Choice<EdgeRouting>[] = [
  { value: 'routed', label: 'Routed', description: 'Follow the paths the layout found around boxes.' },
  { value: 'orthogonal', label: 'Square', description: 'Right-angled lines; children share one line to their parent.' },
  { value: 'curved', label: 'Curved', description: 'Smooth curves between box sides.' },
  { value: 'straight', label: 'Straight', description: 'Direct lines between box centres.' },
]

export const OTHER_LINKS: Choice<OtherLinks>[] = [
  { value: 'show', label: 'Always' },
  { value: 'selection', label: 'On selection' },
]

export const DEFAULT_LAYOUT: LayoutSettings = {
  algorithm: 'layered',
  direction: 'TB',
  layoutMode: 'layered',
  grouping: 'file',
  spacing: 'normal',
  pullIn: true,
}

export type DetailLevel = 'types' | 'packages'

export const DETAIL_LEVELS: Choice<DetailLevel>[] = [
  { value: 'types', label: 'Types', description: 'Every class, enum and data type as its own box.' },
  {
    value: 'packages',
    label: 'Packages',
    description: 'Each package as one box, with the links between them counted. Expand any from the tree.',
  },
]

export const PORT_MODES: Choice<PortMode>[] = [
  { value: 'none', label: 'Off', description: 'Every link is drawn as a line. You can still port single links from their details.' },
  {
    value: 'frames',
    label: 'Frames',
    description: 'Links between files or packages become port tags, and the frames are laid out apart.',
  },
  { value: 'long', label: 'Long Links', description: 'Links that cross a long way become port tags.' },
  {
    value: 'all',
    label: 'All',
    description: 'Every link becomes a pair of port tags. Links still place the boxes.',
  },
]

export const DEFAULT_EDGE_DISPLAY: EdgeDisplay = {
  routing: 'routed',
  otherLinks: 'show',
  labels: true,
  ports: 'none',
  portRoom: false,
}

export function spacingFactor(spacing: LayoutSpacing): number {
  return LAYOUT_SPACINGS.find((s) => s.value === spacing)?.factor ?? 1
}
