
export type LayoutDirection = 'TB' | 'LR'

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
