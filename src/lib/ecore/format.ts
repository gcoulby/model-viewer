import type { Multiplicity, ParsedAttribute, ParsedReference } from '@/types/ecore'
import type {
  DrawnNode,
  GraphNode,
  ResolvedAttribute,
  ResolvedOperation,
  ResolvedReference,
} from '@/types/graph'

export const MAX_ROWS = 24

export function multiplicitySuffix({ lower, upper }: Multiplicity): string {
  if (lower === 0 && upper === 1) return ''
  if (lower === 0 && upper < 0) return ' [*]'
  const up = upper < 0 ? '*' : String(upper)
  return lower === upper ? ` [${up}]` : ` [${lower}..${up}]`
}

/**
 * A feature's behaviour flags that differ from EMF's defaults, as UML property modifiers. Derived is shown
 * as a leading `/` instead, and unique and ordered only mean something for features holding many values.
 */
export function featureModifiers(feature: ParsedAttribute | ParsedReference): string[] {
  const many = feature.multiplicity.upper < 0 || feature.multiplicity.upper > 1
  const flags: string[] = []
  if (feature.kind === 'attribute' && feature.isId) flags.push('id')
  if (feature.readOnly) flags.push('readOnly')
  if (feature.transient) flags.push('transient')
  if (feature.volatile) flags.push('volatile')
  if (feature.unsettable) flags.push('unsettable')
  if (many && !feature.unique) flags.push('nonunique')
  if (many && !feature.ordered) flags.push('unordered')
  return flags
}

const braces = (flags: string[]) => (flags.length ? ` {${flags.join(', ')}}` : '')

export function attributeRow({ feature, typeName }: ResolvedAttribute): string {
  let text = `${feature.derived ? '/' : ''}${feature.name}: ${typeName}${multiplicitySuffix(feature.multiplicity)}`
  if (feature.defaultValue != null && feature.defaultValue !== '') text += ` = ${feature.defaultValue}`
  return text + braces(featureModifiers(feature))
}

/** A reference's name as its link is labelled: derived mark, name, multiplicity and modifiers. */
export function referenceLabel(feature: ParsedReference): string {
  return `${feature.derived ? '/' : ''}${feature.name}${multiplicitySuffix(feature.multiplicity)}${braces(featureModifiers(feature))}`
}

/** A reference as a row in its class's box, written like an attribute so a box lists every feature. */
export function referenceBoxRow({ feature, typeName }: ResolvedReference): string {
  return `${feature.derived ? '/' : ''}${feature.name}: ${typeName}${multiplicitySuffix(feature.multiplicity)}${braces(featureModifiers(feature))}`
}

export function referenceRow({ feature, typeName, opposite }: ResolvedReference): string {
  let text = `${feature.derived ? '/' : ''}${feature.name}: ${typeName}${multiplicitySuffix(feature.multiplicity)}`
  text += braces([...(feature.containment ? ['containment'] : []), ...featureModifiers(feature)])
  if (opposite) text += `  opposite: ${opposite.name}`
  return text
}

export function operationRow({ operation, typeName, parameterTypeNames }: ResolvedOperation): string {
  const params = operation.parameters
    .map((p, i) => `${p.name}: ${parameterTypeNames[i]}${multiplicitySuffix(p.multiplicity)}`)
    .join(', ')
  const result = typeName ? `: ${typeName}${multiplicitySuffix(operation.multiplicity)}` : ''
  return `${operation.name}(${params})${result}`
}

export function capRows(rows: string[]): string[] {
  return rows.length > MAX_ROWS
    ? [...rows.slice(0, MAX_ROWS), `… ${rows.length - MAX_ROWS} more`]
    : rows
}

export function stereotypeOf(node: DrawnNode): string {
  switch (node.kind) {
    case 'class':
      return node.interface ? '«interface»' : node.abstract ? '«abstract»' : ''
    case 'enum':
      return '«enumeration»'
    case 'datatype':
      return '«datatype»'
    case 'external':
      return '«external»'
    case 'package':
      return '«package»'
  }
}

export function kindLabel(node: DrawnNode): string {
  switch (node.kind) {
    case 'class':
      return node.interface ? 'Interface' : node.abstract ? 'Abstract class' : 'Class'
    case 'enum':
      return 'Enum'
    case 'datatype':
      return 'Data type'
    case 'external':
      return 'External type'
    case 'package':
      return 'Collapsed package'
  }
}

export function classifierLetter(node: GraphNode): string {
  switch (node.kind) {
    case 'class':
      return node.interface ? 'I' : node.abstract ? 'A' : 'C'
    case 'enum':
      return 'E'
    case 'datatype':
      return 'D'
    case 'external':
      return 'X'
  }
}
