import type {
  ParsedAttribute,
  ParsedEnumLiteral,
  ParsedOperation,
  ParsedReference,
} from './ecore'

export type ResolvedType =
  | { status: 'node'; nodeId: string }
  | { status: 'builtin'; name: string }
  | { status: 'external'; name: string; uri: string }

export interface ResolvedAttribute {
  feature: ParsedAttribute
  typeName: string
  /** Set when the type is a loaded class, enum or data type. */
  typeNodeId: string | null
}

export interface ResolvedReference {
  feature: ParsedReference
  typeName: string
  targetId: string | null
  opposite: ParsedReference | null
}

export interface ResolvedOperation {
  operation: ParsedOperation
  typeName: string
  parameterTypeNames: string[]
}

export interface PackageInfo {
  id: string
  fullName: string
  nsURI: string
  fileName: string
  modelIndex: number
}

interface GraphNodeBase {
  id: string
  name: string
  superIds: string[]
  subIds: string[]
}

export interface ClassGraphNode extends GraphNodeBase {
  kind: 'class'
  package: PackageInfo
  abstract: boolean
  interface: boolean
  attributes: ResolvedAttribute[]
  references: ResolvedReference[]
  operations: ResolvedOperation[]
}

export interface EnumGraphNode extends GraphNodeBase {
  kind: 'enum'
  package: PackageInfo
  literals: ParsedEnumLiteral[]
}

export interface DataTypeGraphNode extends GraphNodeBase {
  kind: 'datatype'
  package: PackageInfo
  instanceClassName: string
}

export interface ExternalGraphNode extends GraphNodeBase {
  kind: 'external'
  /** "Ecore (built in)" or the URI of the file that was not loaded. */
  source: string
}

export type GraphNode =
  | ClassGraphNode
  | EnumGraphNode
  | DataTypeGraphNode
  | ExternalGraphNode

export type EdgeKind = 'inherit' | 'containment' | 'reference' | 'enumLink'

export interface InheritGraphEdge {
  id: string
  kind: 'inherit'
  from: string
  to: string
}

export interface FeatureGraphEdge {
  id: string
  kind: 'containment' | 'reference' | 'enumLink'
  from: string
  to: string
  forward: ResolvedReference | ResolvedAttribute
  /** Present only for a merged pair of opposite references. */
  back: ResolvedReference | null
}

export type GraphEdge = InheritGraphEdge | FeatureGraphEdge

export interface ModelGraph {
  nodes: Map<string, GraphNode>
  edges: GraphEdge[]
}

/** Position of an edge within the set of edges between the same two nodes. */
export interface ParallelInfo {
  index: number
  count: number
  flip: 1 | -1
}
