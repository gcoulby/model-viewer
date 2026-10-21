export type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL'

/** Which links place the boxes; links outside the mode are still drawn. */
export type LayoutMode = 'layered' | 'structure' | 'inheritance'

/**
 * How boxes are placed. `dagre` is the classic layered layout; the rest run in ELK: `layered` (ELK's
 * Sugiyama layout with routed links), `tree`, `stress`, `force`, `radial`, and `grid` (packed, no links).
 */
export type LayoutAlgorithm = 'dagre' | 'layered' | 'tree' | 'stress' | 'force' | 'radial' | 'grid'

/** Which boxes are kept together inside a tinted frame. */
export type LayoutGrouping = 'none' | 'file' | 'package'

export type LayoutSpacing = 'compact' | 'normal' | 'spacious'

/** How links are drawn. `routed` follows the path the layout found, until either end is moved. */
export type EdgeRouting = 'straight' | 'orthogonal' | 'curved' | 'routed'

/** Whether links that do not shape the layout are always drawn, or only around the selection. */
export type OtherLinks = 'show' | 'selection'

export interface ViewOptions {
  attributes: boolean
  operations: boolean
  inheritance: boolean
  references: boolean
  enums: boolean
  enumLinks: boolean
  dataTypes: boolean
  external: boolean
  algorithm: LayoutAlgorithm
  direction: LayoutDirection
  layoutMode: LayoutMode
  grouping: LayoutGrouping
  spacing: LayoutSpacing
  /** Lets boxes that no shaping link reaches be placed by their other links instead of packed apart. */
  pullIn: boolean
}

/**
 * Which links are drawn as a pair of port tags instead of a line: none, those between frames (files or
 * packages; these also stop shaping the layout, so the frames separate), or those longer than a screen or so.
 */
export type PortMode = 'none' | 'frames' | 'long'

/** Options that change how links are drawn. `ports: 'frames'` and `portRoom` also change where boxes go. */
export interface EdgeDisplay {
  routing: EdgeRouting
  otherLinks: OtherLinks
  labels: boolean
  ports: PortMode
  /** Keeps space clear beside each box for its port tags, so tags never cover boxes or each other. */
  portRoom: boolean
}

/** The part of `ViewOptions` the layout engines read. */
export type LayoutSettings = Pick<
  ViewOptions,
  'algorithm' | 'direction' | 'layoutMode' | 'grouping' | 'spacing' | 'pullIn'
>

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
