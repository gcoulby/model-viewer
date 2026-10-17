
export type LayoutDirection = 'TB' | 'LR'

/** Which links place the boxes; links outside the mode are still drawn. */
export type LayoutMode = 'layered' | 'structure' | 'inheritance' | 'grid'

export type LayoutSpacing = 'compact' | 'normal' | 'spacious'

export interface ViewOptions {
  attributes: boolean
  operations: boolean
  inheritance: boolean
  references: boolean
  enums: boolean
  enumLinks: boolean
  dataTypes: boolean
  external: boolean
  direction: LayoutDirection
  layoutMode: LayoutMode
  spacing: LayoutSpacing
}

export interface NodeGeometry {
  width: number
  height: number
  headerHeight: number
  stereotype: string
  compartments: string[][]
  collapsed: boolean
}

export interface NodePaint {
  header: string
  stroke: string
}
