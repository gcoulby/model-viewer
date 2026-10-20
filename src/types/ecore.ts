
/** upper === -1 means unbounded. */
export interface Multiplicity {
  lower: number
  upper: number
}

interface ParsedFeatureBase {
  name: string
  path: string
  multiplicity: Multiplicity
  typeRaw: string
  derived: boolean
  transient: boolean
  volatile: boolean
  readOnly: boolean
  defaultValue: string | null
}

export interface ParsedAttribute extends ParsedFeatureBase {
  kind: 'attribute'
  isId: boolean
}

export interface ParsedReference extends ParsedFeatureBase {
  kind: 'reference'
  containment: boolean
  oppositeRaw: string
}

export interface ParsedParameter {
  name: string
  typeRaw: string
  multiplicity: Multiplicity
}

export interface ParsedOperation {
  name: string
  typeRaw: string
  multiplicity: Multiplicity
  parameters: ParsedParameter[]
}

interface ParsedClassifierBase {
  id: string
  name: string
  path: string
  packageId: string
}

export interface ParsedClass extends ParsedClassifierBase {
  kind: 'class'
  abstract: boolean
  interface: boolean
  attributes: ParsedAttribute[]
  references: ParsedReference[]
  operations: ParsedOperation[]
  superRaw: string[]
}

export interface ParsedEnumLiteral {
  name: string
  value: number
}

export interface ParsedEnum extends ParsedClassifierBase {
  kind: 'enum'
  literals: ParsedEnumLiteral[]
}

export interface ParsedDataType extends ParsedClassifierBase {
  kind: 'datatype'
  instanceClassName: string
}

export type ParsedClassifier = ParsedClass | ParsedEnum | ParsedDataType

export interface ParsedPackage {
  id: string
  name: string
  fullName: string
  nsURI: string
  nsPrefix: string
  path: string
  subpackages: ParsedPackage[]
  classifiers: ParsedClassifier[]
}

export interface ParsedModel {
  index: number
  /** Path of the file relative to the opened folder, `/`-separated (just the file name for a loose file). */
  fileName: string
  /** Lower-cased `fileName`. Used to match cross-file references and to replace a reloaded file. */
  key: string
  /** Lower-cased directory of the file, '' at the root. Relative references are resolved against it. */
  dir: string
  roots: ParsedPackage[]
  packages: ParsedPackage[]
  classifiers: ParsedClassifier[]
}
