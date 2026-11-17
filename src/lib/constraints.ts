import { createElement, insertChild, removeElement } from '@/lib/ecore/edit/dom'

/**
 * Constraints on a feature's values, kept in the metamodel as an EAnnotation on the feature, so they travel
 * with the .ecore file (Eclipse ignores annotations it doesn't know):
 *
 *   <eAnnotations source="http://ecore-studio/constraints">
 *     <details key="min" value="1900"/>
 *   </eAnnotations>
 *
 * The instance generator follows them and Problems checks instances against them.
 */
export const CONSTRAINTS_SOURCE = 'http://ecore-studio/constraints'

/** How an attribute's values are entered and checked. */
export type ValueKind = 'string' | 'int' | 'float' | 'boolean' | 'date' | 'enum'

const INT_TYPES = new Set(['EInt', 'ELong', 'EShort', 'EByte', 'EBigInteger', 'EIntegerObject', 'ELongObject', 'EShortObject', 'EByteObject'])
const FLOAT_TYPES = new Set(['EDouble', 'EFloat', 'EBigDecimal', 'EDoubleObject', 'EFloatObject'])
const BOOLEAN_TYPES = new Set(['EBoolean', 'EBooleanObject'])

export function valueKindOf(typeName: string, isEnum: boolean): ValueKind {
  if (isEnum) return 'enum'
  if (INT_TYPES.has(typeName)) return 'int'
  if (FLOAT_TYPES.has(typeName)) return 'float'
  if (BOOLEAN_TYPES.has(typeName)) return 'boolean'
  if (typeName === 'EDate') return 'date'
  return 'string'
}

export type ConstraintKey = 'min' | 'max' | 'minCount' | 'maxCount' | 'values' | 'pattern'

export type ConstraintDetails = Partial<Record<ConstraintKey, string>>

/** The constraints in a usable form; entries that don't parse are left out (and reported by {@link detailError}). */
export interface Constraints {
  min?: number
  max?: number
  minCount?: number
  maxCount?: number
  values?: string[]
  pattern?: RegExp
}

/** What a constraint applies to: the shape of the feature it is on. */
export interface ConstraintTarget {
  kind: 'attribute' | 'reference'
  many: boolean
  valueKind: ValueKind
}

export const CONSTRAINT_LABELS: Record<ConstraintKey, string> = {
  min: 'Minimum',
  max: 'Maximum',
  minCount: 'At least',
  maxCount: 'At most',
  values: 'Allowed values',
  pattern: 'Pattern',
}

/** The constraint keys that make sense for a feature, in the order they are shown. */
export function keysFor(target: ConstraintTarget): ConstraintKey[] {
  const keys: ConstraintKey[] = []
  if (target.many) keys.push('minCount', 'maxCount')
  if (target.kind === 'reference') return keys
  if (target.valueKind === 'int' || target.valueKind === 'float' || target.valueKind === 'date') keys.push('min', 'max')
  if (target.valueKind === 'string' || target.valueKind === 'enum' || target.valueKind === 'int') keys.push('values')
  if (target.valueKind === 'string') keys.push('pattern')
  return keys
}

/** Splits an allowed-values entry: comma separated, trimmed, empty entries dropped. */
export const splitValues = (raw: string) =>
  raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)

const isDate = (raw: string) => /^\d{4}-\d{2}-\d{2}/.test(raw) && !Number.isNaN(Date.parse(raw))
const asNumber = (raw: string, valueKind: ValueKind) =>
  valueKind === 'date' ? (isDate(raw) ? Date.parse(raw) : NaN) : Number(raw.trim())

/** Why an entry can't be used, or null when it can. */
export function detailError(key: ConstraintKey, raw: string, target: ConstraintTarget): string | null {
  if (!raw.trim()) return null
  switch (key) {
    case 'min':
    case 'max':
      if (target.valueKind === 'date') return isDate(raw) ? null : 'Use a date such as 2026-01-31'
      if (raw.trim() === '' || Number.isNaN(Number(raw.trim()))) return 'Use a number'
      if (target.valueKind === 'int' && !Number.isInteger(Number(raw.trim()))) return 'Use a whole number'
      return null
    case 'minCount':
    case 'maxCount':
      return /^\d+$/.test(raw.trim()) ? null : 'Use a whole number, 0 or more'
    case 'pattern':
      try {
        new RegExp(raw)
        return null
      } catch {
        return 'Not a valid regular expression'
      }
    case 'values':
      return splitValues(raw).length ? null : 'List values separated by commas'
  }
}

/** Reads the details into constraints, dropping entries that don't parse. */
export function parseConstraints(details: ConstraintDetails, target: ConstraintTarget): Constraints {
  const out: Constraints = {}
  for (const key of Object.keys(details) as ConstraintKey[]) {
    const raw = details[key]
    if (raw === undefined || !raw.trim() || detailError(key, raw, target)) continue
    if (key === 'min' || key === 'max') out[key] = asNumber(raw, target.valueKind)
    else if (key === 'minCount' || key === 'maxCount') out[key] = Number(raw.trim())
    else if (key === 'values') out.values = splitValues(raw)
    else if (key === 'pattern') out.pattern = new RegExp(`^(?:${raw})$`)
  }
  return out
}

/** Problems with the constraints themselves: entries that don't parse, and ranges that are empty. */
export function constraintsErrors(details: ConstraintDetails, target: ConstraintTarget): string[] {
  const errors: string[] = []
  for (const key of Object.keys(details) as ConstraintKey[]) {
    const problem = detailError(key, details[key] ?? '', target)
    if (problem) errors.push(`${CONSTRAINT_LABELS[key]}: ${problem.toLowerCase()}`)
  }
  const c = parseConstraints(details, target)
  if (c.min !== undefined && c.max !== undefined && c.min > c.max) errors.push('The minimum is above the maximum')
  if (c.minCount !== undefined && c.maxCount !== undefined && c.minCount > c.maxCount) errors.push('"At least" is above "at most"')
  return errors
}

const show = (n: number, valueKind: ValueKind) =>
  valueKind === 'date' ? new Date(n).toISOString().slice(0, 10) : String(n)

/** Why a single value breaks the constraints, or null when it keeps them. */
export function valueViolation(name: string, value: string, c: Constraints, valueKind: ValueKind): string | null {
  if (c.values && !c.values.includes(value)) return `${name} must be one of ${c.values.join(', ')}, not "${value}"`
  if (c.pattern && !c.pattern.test(value)) return `${name} "${value}" doesn't match the pattern ${c.pattern.source.slice(4, -2)}`
  if (c.min !== undefined || c.max !== undefined) {
    const n = asNumber(value, valueKind)
    if (Number.isNaN(n)) return null
    if (c.min !== undefined && n < c.min) return `${name} must be at least ${show(c.min, valueKind)}, not ${value}`
    if (c.max !== undefined && n > c.max) return `${name} must be at most ${show(c.max, valueKind)}, not ${value}`
  }
  return null
}

/** Why a feature's number of values breaks the constraints, or null. */
export function countViolation(name: string, count: number, c: Constraints): string | null {
  if (c.minCount !== undefined && count < c.minCount) return `${name} needs at least ${c.minCount}, but has ${count}`
  if (c.maxCount !== undefined && count > c.maxCount) return `${name} allows at most ${c.maxCount}, but has ${count}`
  return null
}

const annotationOf = (feature: Element) =>
  Array.from(feature.children).find((c) => c.localName === 'eAnnotations' && c.getAttribute('source') === CONSTRAINTS_SOURCE) ?? null

/** The constraint details written on a feature element of an .ecore file. */
export function readDetails(feature: Element): ConstraintDetails {
  const out: ConstraintDetails = {}
  const annotation = annotationOf(feature)
  for (const d of Array.from(annotation?.children ?? [])) {
    if (d.localName !== 'details') continue
    const key = d.getAttribute('key') as ConstraintKey | null
    if (key && key in CONSTRAINT_LABELS) out[key] = d.getAttribute('value') ?? ''
  }
  return out
}

/**
 * Sets one constraint on a feature element, or removes it with null or an empty value. The annotation is
 * added before the feature's other contents, where EMF writes annotations, and removed once it is empty.
 */
export function setConstraint(feature: Element, key: ConstraintKey, value: string | null) {
  const doc = feature.ownerDocument
  let annotation = annotationOf(feature)
  const clear = value === null || value.trim() === ''
  if (!annotation) {
    if (clear) return
    annotation = createElement(doc, 'eAnnotations')
    annotation.setAttribute('source', CONSTRAINTS_SOURCE)
    insertChild(feature, annotation, feature.firstElementChild)
  }
  const entry = Array.from(annotation.children).find((d) => d.localName === 'details' && d.getAttribute('key') === key)
  if (clear) {
    if (entry) removeElement(entry)
    if (!annotation.children.length) removeElement(annotation)
    return
  }
  if (entry) entry.setAttribute('value', value)
  else {
    const order = Object.keys(CONSTRAINT_LABELS)
    const created = createElement(doc, 'details')
    created.setAttribute('key', key)
    created.setAttribute('value', value)
    const before = Array.from(annotation.children).find((d) => order.indexOf(d.getAttribute('key') ?? '') > order.indexOf(key)) ?? null
    insertChild(annotation, created, before)
  }
}
