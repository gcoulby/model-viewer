import { ECORE_NAMESPACE } from '@/data/ecoreNamespace'
import { ECORE_CLASSES, ECORE_DATA_TYPES } from './builtins'
import { pathOf, type ElementRef } from './dom'
import { KIND_LABEL, kindOf, type EKind } from './kinds'
import { tokenName } from './labels'
import { fragmentOf, refTokens, splitToken, targetFile, type RefFile } from './refs'

export type Severity = 'error' | 'warning'

export interface Problem {
  severity: Severity
  message: string
  /** The element the problem is on. */
  ref: ElementRef
  /** The EcoreValidator constraint it corresponds to, for reference. */
  code: string
}

const DATA_TYPES = new Set<string>(ECORE_DATA_TYPES)
const CLASSES = new Set<string>(ECORE_CLASSES)
const NAMED = new Set<EKind>([
  'EPackage',
  'EClass',
  'EDataType',
  'EEnum',
  'EEnumLiteral',
  'EAttribute',
  'EReference',
  'EOperation',
  'EParameter',
  'ETypeParameter',
])
const JAVA_IDENTIFIER = /^[\p{L}_$][\p{L}\p{N}_$]*$/u

/** What a reference token resolves to. */
type Resolved =
  | { status: 'element'; el: Element; kind: EKind | null }
  | { status: 'builtin'; name: string; known: boolean; dataType: boolean }
  | { status: 'missing'; name: string }
  | { status: 'notOpen'; name: string; uri: string }

/**
 * Checks the open files against the rules Eclipse's EcoreValidator applies, as far as they matter while
 * editing: names, types, references, opposites, bounds and namespaces. Problems are reported on the element
 * that has them, as errors (the model is wrong) or warnings (it is legal but likely to cause trouble).
 */
export function validate(files: RefFile[], docs: ReadonlyMap<string, Document>): Problem[] {
  const problems: Problem[] = []
  // Each file's elements by fragment, built once, so resolving a reference is a lookup rather than a walk.
  const index = new Map<string, Map<string, Element>>()
  const elements: { file: RefFile; el: Element; kind: EKind }[] = []
  for (const file of files) {
    const doc = docs.get(file.key)
    if (!doc) continue
    const byFragment = new Map<string, Element>()
    const stack: Element[] = [doc.documentElement]
    while (stack.length) {
      const el = stack.pop()!
      const kind = kindOf(el)
      if (kind) {
        elements.push({ file, el, kind })
        const fragment = fragmentOf(el)
        if (fragment !== null && !byFragment.has(fragment)) byFragment.set(fragment, el)
      }
      for (let i = el.children.length - 1; i >= 0; i--) stack.push(el.children[i]!)
    }
    index.set(file.key, byFragment)
  }
  const fileOfEl = new Map(elements.map((e) => [e.el, e.file]))

  const report = (file: RefFile, el: Element, severity: Severity, code: string, message: string) =>
    problems.push({ severity, code, message, ref: { key: file.key, path: pathOf(el) } })

  const resolve = (from: RefFile, token: string): Resolved => {
    const { uri, fragment } = splitToken(token)
    const name = tokenName(token)
    if (uri.includes(ECORE_NAMESPACE)) {
      return { status: 'builtin', name, known: DATA_TYPES.has(name) || CLASSES.has(name), dataType: DATA_TYPES.has(name) }
    }
    const file = targetFile(from, uri, files)
    if (!file) return { status: 'notOpen', name, uri }
    const el = index.get(file.key)?.get(fragment)
    return el ? { status: 'element', el, kind: kindOf(el) } : { status: 'missing', name }
  }

  /** Reports a token that does not resolve, and returns what it does resolve to otherwise. */
  const check = (file: RefFile, el: Element, token: string, what: string): Resolved => {
    const target = resolve(file, token)
    if (target.status === 'missing') report(file, el, 'error', 'UnresolvedProxy', `${what} ${target.name} doesn't exist`)
    else if (target.status === 'notOpen') {
      report(file, el, 'warning', 'UnresolvedProxy', `${what} ${target.name} is in ${target.uri}, which isn't open`)
    } else if (target.status === 'builtin' && !target.known) {
      report(file, el, 'error', 'UnresolvedProxy', `${what} ${target.name} isn't one of Ecore's types`)
    }
    return target
  }

  const typeToken = (el: Element): string | null => {
    const generic = Array.from(el.children).find((c) => c.localName === 'eGenericType')
    if (generic) return generic.getAttribute('eClassifier') ?? (generic.getAttribute('eTypeParameter') ? '' : null)
    return refTokens(el.getAttribute('eType'))[0] ?? null
  }

  const name = (el: Element) => el.getAttribute('name') ?? ''

  for (const { file, el, kind } of elements) {
    // Names.
    if (NAMED.has(kind)) {
      const n = name(el)
      if (!n) report(file, el, 'error', 'WellFormedName', `This ${KIND_LABEL[kind].toLowerCase()} has no name`)
      else if (!JAVA_IDENTIFIER.test(n)) report(file, el, 'error', 'WellFormedName', `${n} isn't a valid name: use letters, digits and _ only, not starting with a digit`)
    }

    // Packages.
    if (kind === 'EPackage') {
      if (!el.getAttribute('nsURI')) report(file, el, 'error', 'WellFormedNsURI', 'The namespace URI is missing')
      if (!el.getAttribute('nsPrefix')) report(file, el, 'error', 'WellFormedNsPrefix', 'The namespace prefix is missing')
    }

    // Typed elements.
    if (kind === 'EAttribute' || kind === 'EReference' || kind === 'EParameter' || kind === 'EOperation') {
      const token = typeToken(el)
      if (token === null) {
        if (kind !== 'EOperation') report(file, el, 'error', 'ValidType', 'No type is set')
      } else if (token) {
        const target = check(file, el, token, 'Type')
        if (kind === 'EAttribute') {
          const bad = (target.status === 'element' && target.kind === 'EClass') || (target.status === 'builtin' && target.known && !target.dataType)
          if (bad) report(file, el, 'error', 'ConsistentType', `An attribute's type must be a data type or enum, not the class ${tokenName(token)}`)
        }
        if (kind === 'EReference') {
          const bad = (target.status === 'element' && target.kind !== 'EClass') || (target.status === 'builtin' && target.dataType)
          if (bad) report(file, el, 'error', 'ConsistentType', `A reference's type must be a class, not ${tokenName(token)}`)
        }
      }
      const lower = Number(el.getAttribute('lowerBound') ?? 0)
      const upper = Number(el.getAttribute('upperBound') ?? 1)
      if (lower < 0) report(file, el, 'error', 'ValidLowerBound', "The lower bound can't be negative")
      if (upper === 0) report(file, el, 'error', 'ValidUpperBound', "The upper bound can't be 0")
      else if (upper > 0 && lower > upper) report(file, el, 'error', 'ConsistentBounds', `The lower bound (${lower}) is more than the upper bound (${upper})`)
    }

    // Classes.
    if (kind === 'EClass') {
      if (el.getAttribute('interface') === 'true' && el.getAttribute('abstract') !== 'true') {
        report(file, el, 'error', 'InterfaceIsAbstract', 'An interface must also be abstract')
      }
      for (const token of refTokens(el.getAttribute('eSuperTypes'))) {
        const target = check(file, el, token, 'Supertype')
        if (target.status === 'element' && target.el === el) report(file, el, 'error', 'NoCircularSuperTypes', 'A class cannot be its own supertype')
        else if ((target.status === 'element' && target.kind !== 'EClass') || (target.status === 'builtin' && target.dataType)) {
          report(file, el, 'error', 'ConsistentSuperTypes', `Supertype ${tokenName(token)} isn't a class`)
        }
      }
      const ids = Array.from(el.children).filter((c) => kindOf(c) === 'EAttribute' && c.getAttribute('iD') === 'true')
      if (ids.length > 1) report(file, el, 'error', 'AtMostOneID', `More than one ID attribute: ${ids.map(name).join(', ')}`)
    }

    if (kind === 'EDataType' && !el.getAttribute('instanceClassName')) {
      report(file, el, 'warning', 'WellFormedInstanceTypeName', 'No instance class is set, so code generation has nothing to map this type to')
    }

    // References.
    if (kind === 'EReference') {
      const opposite = el.getAttribute('eOpposite')
      if (opposite) {
        const target = check(file, el, opposite, 'Opposite')
        if (target.status === 'element') {
          const other = target.el
          const otherFile = fileOfEl.get(other) ?? file
          const otherName = name(other)
          if (target.kind !== 'EReference') report(file, el, 'error', 'ConsistentOpposite', `Opposite ${otherName} isn't a reference`)
          else {
            const back = other.getAttribute('eOpposite')
            const backTarget = back ? resolve(otherFile, back) : null
            if (!backTarget || backTarget.status !== 'element' || backTarget.el !== el) {
              report(file, el, 'error', 'ConsistentOpposite', `Opposite ${otherName} doesn't name this reference as its opposite`)
            }
            const ownType = typeToken(el)
            const typeTarget = ownType ? resolve(file, ownType) : null
            if (typeTarget?.status === 'element' && typeTarget.el !== other.parentElement) {
              report(file, el, 'error', 'ConsistentOpposite', `Opposite ${otherName} isn't in this reference's type, ${tokenName(ownType!)}`)
            }
            if (el.getAttribute('containment') === 'true' && other.getAttribute('containment') === 'true') {
              report(file, el, 'error', 'ConsistentContainer', `This reference and its opposite ${otherName} can't both be containments`)
            }
          }
        }
      }
      for (const token of refTokens(el.getAttribute('eKeys'))) {
        const target = check(file, el, token, 'Key')
        if (target.status === 'element' && target.kind !== 'EAttribute') report(file, el, 'error', 'ConsistentKeys', `Key ${tokenName(token)} isn't an attribute`)
      }
    }

    if (kind === 'EOperation') {
      for (const token of refTokens(el.getAttribute('eExceptions'))) check(file, el, token, 'Exception')
    }

    if (kind === 'EGenericType') {
      const classifier = el.getAttribute('eClassifier')
      if (classifier) check(file, el, refTokens(classifier)[0] ?? classifier, 'Type')
      const parameter = el.getAttribute('eTypeParameter')
      if (parameter) check(file, el, parameter, 'Type parameter')
    }

    // Names that clash within one container.
    const groups = new Map<string, Element[]>()
    for (const child of Array.from(el.children)) {
      const childKind = kindOf(child)
      if (!childKind || !NAMED.has(childKind) || !name(child)) continue
      // Features and operations clash with their own kind; classifiers with each other. Operations clash
      // only on their whole signature, since overloads are legal.
      const signature =
        childKind === 'EOperation'
          ? `(${Array.from(child.children)
              .filter((c) => c.localName === 'eParameters')
              .map((p) => typeToken(p) ?? '')
              .join(',')})`
          : ''
      const group = `${child.localName}|${name(child).toLowerCase()}${signature}`
      const list = groups.get(group)
      if (list) list.push(child)
      else groups.set(group, [child])
    }
    for (const clash of groups.values()) {
      if (clash.length < 2) continue
      const childKind = kindOf(clash[0]!)!
      const severity: Severity = 'error'
      const exact = new Set(clash.map(name)).size === 1
      for (const child of clash) {
        report(
          file,
          child,
          severity,
          'UniqueNames',
          exact
            ? childKind === 'EOperation'
              ? `Another operation here has the same name and parameter types`
              : `Another ${KIND_LABEL[childKind].toLowerCase()} here is also called ${name(child)}`
            : `${name(child)} differs from another name here only in case`,
        )
      }
    }
  }

  // Supertype cycles, across files.
  const supers = new Map<Element, Element[]>()
  for (const { file, el, kind } of elements) {
    if (kind !== 'EClass') continue
    supers.set(
      el,
      refTokens(el.getAttribute('eSuperTypes')).flatMap((token) => {
        const target = resolve(file, token)
        return target.status === 'element' && target.el !== el ? [target.el] : []
      }),
    )
  }
  const state = new Map<Element, 'visiting' | 'done'>()
  const inCycle = new Set<Element>()
  const visit = (el: Element, trail: Element[]) => {
    if (state.get(el) === 'done') return
    if (state.get(el) === 'visiting') {
      for (const member of trail.slice(trail.indexOf(el))) inCycle.add(member)
      return
    }
    state.set(el, 'visiting')
    for (const next of supers.get(el) ?? []) visit(next, [...trail, el])
    state.set(el, 'done')
  }
  for (const el of supers.keys()) visit(el, [])
  for (const el of inCycle) {
    const file = fileOfEl.get(el)
    if (file) report(file, el, 'error', 'NoCircularSuperTypes', 'Its supertypes lead back round to itself')
  }

  // Namespace URIs shared between open files.
  const byUri = new Map<string, { file: RefFile; el: Element }[]>()
  for (const { file, el, kind } of elements) {
    const uri = kind === 'EPackage' ? el.getAttribute('nsURI') : null
    if (!uri) continue
    const list = byUri.get(uri)
    if (list) list.push({ file, el })
    else byUri.set(uri, [{ file, el }])
  }
  for (const [uri, list] of byUri) {
    if (list.length < 2) continue
    for (const { file, el } of list) {
      const others = list.filter((o) => o.el !== el).map((o) => (o.file === file ? name(o.el) : o.file.name))
      report(file, el, 'warning', 'UniqueNsURIs', `${others.join(', ')} also uses the namespace URI ${uri}`)
    }
  }

  return problems
}
