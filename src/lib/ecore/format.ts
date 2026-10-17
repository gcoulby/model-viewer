import type { Multiplicity } from '@/types/ecore'
import type {
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

export function attributeRow({ feature, typeName }: ResolvedAttribute): string {
  let text = `${feature.derived ? '/' : ''}${feature.name}: ${typeName}${multiplicitySuffix(feature.multiplicity)}`
  if (feature.isId) text += ' {id}'
  if (feature.defaultValue != null && feature.defaultValue !== '') text += ` = ${feature.defaultValue}`
  return text
}

export function referenceRow({ feature, typeName, opposite }: ResolvedReference): string {
  let text = `${feature.name}: ${typeName}${multiplicitySuffix(feature.multiplicity)}`
  const flags: string[] = []
  if (feature.containment) flags.push('containment')
  if (feature.derived) flags.push('derived')
  if (feature.transient) flags.push('transient')
  if (feature.readOnly) flags.push('readonly')
  if (flags.length) text += ` {${flags.join(', ')}}`
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

export function stereotypeOf(node: GraphNode): string {
  switch (node.kind) {
    case 'class':
      return node.interface ? '«interface»' : node.abstract ? '«abstract»' : ''
    case 'enum':
      return '«enumeration»'
    case 'datatype':
      return '«datatype»'
    case 'external':
      return '«external»'
  }
}

export function kindLabel(node: GraphNode): string {
  switch (node.kind) {
    case 'class':
      return node.interface ? 'Interface' : node.abstract ? 'Abstract class' : 'Class'
    case 'enum':
      return 'Enum'
    case 'datatype':
      return 'Data type'
    case 'external':
      return 'External type'
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
