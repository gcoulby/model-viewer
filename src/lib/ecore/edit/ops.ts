import {
  createElement,
  elementAt,
  insertChild,
  moveElement,
  pathOf,
  removeElement,
  setAttr,
  type ElementRef,
} from './dom'
import { FEATURES, kindOf, type NewChildSpec } from './kinds'
import { elementForFragment, fragmentOf, refTo, resolveToken, withRefactor, type RefChoice, type RefFile } from './refs'

/** The open files and their documents, as an edit sees them. Documents are parsed on first use. */
export interface EditDocs {
  files: RefFile[]
  doc: (key: string) => Document | null
}

/** A type field's value: a classifier, a built-in Ecore type, a type parameter in scope, or nothing. */
export type TypeChoice = RefChoice | { kind: 'typeParameter'; fragment: string } | null

function fileOf(d: EditDocs, key: string): RefFile {
  const file = d.files.find((f) => f.key === key)
  if (!file) throw new Error(`No open file ${key}`)
  return file
}

function elementOf(d: EditDocs, ref: ElementRef): Element {
  const doc = d.doc(ref.key)
  const el = doc && elementAt(doc, ref.path)
  if (!el) throw new Error('That element no longer exists.')
  return el
}

function uniqueName(parent: Element, tag: string, base: string, numberFirst = false): string {
  const taken = new Set(
    Array.from(parent.children)
      .filter((c) => c.localName === tag)
      .map((c) => c.getAttribute('name')),
  )
  if (!numberFirst && !taken.has(base)) return base
  for (let n = numberFirst ? 1 : 2; ; n++) if (!taken.has(`${base}${n}`)) return `${base}${n}`
}

/** Where a new `tag` child goes so the file keeps Eclipse's order: after its kind, before later kinds. */
function insertionPoint(parent: Element, tag: string): Element | null {
  const kind = kindOf(parent)
  const order = kind ? FEATURES[kind].map((f) => f.tag) : []
  const at = order.indexOf(tag)
  return Array.from(parent.children).find((c) => order.indexOf(c.localName) > at) ?? null
}

const TYPE_PARAMETER_NAMES = ['T', 'U', 'V', 'W', 'K', 'E']

/** Fills in what a new element of each kind starts with, so it is valid and named as soon as it appears. */
function initialise(d: EditDocs, key: string, parent: Element, el: Element, spec: NewChildSpec) {
  const name = (base: string, numberFirst = false) => el.setAttribute('name', uniqueName(parent, spec.tag, base, numberFirst))
  switch (spec.kind) {
    case 'EClass':
      return name('NewClass')
    case 'EEnum':
      return name('NewEnum')
    case 'EDataType':
      name('NewDataType')
      el.setAttribute('instanceClassName', 'java.lang.String')
      return
    case 'EPackage': {
      name('subpackage')
      const base = (parent.getAttribute('nsURI') ?? 'http://www.example.org').replace(/\/$/, '')
      el.setAttribute('nsURI', `${base}/${el.getAttribute('name')}`)
      el.setAttribute('nsPrefix', el.getAttribute('name') ?? '')
      return
    }
    case 'EAttribute':
      name('attribute')
      el.setAttribute('eType', refTo(fileOf(d, key), { kind: 'builtin', name: 'EString', eKind: 'EDataType' }, d.files, true))
      return
    case 'EReference':
      return name('reference')
    case 'EOperation':
      return name('operation')
    case 'EParameter':
      return name('parameter')
    case 'EEnumLiteral': {
      const literals = Array.from(parent.children).filter((c) => c.localName === 'eLiterals')
      const values = literals.map((l, i) => Number(l.getAttribute('value') ?? i))
      name('LITERAL', true)
      const value = values.length ? Math.max(...values) + 1 : 0
      if (value !== 0) el.setAttribute('value', String(value))
      return
    }
    case 'ETypeParameter': {
      const taken = new Set(Array.from(parent.children).map((c) => c.getAttribute('name')))
      el.setAttribute('name', TYPE_PARAMETER_NAMES.find((n) => !taken.has(n)) ?? uniqueName(parent, spec.tag, 'T'))
      return
    }
    case 'EStringToStringMapEntry':
      el.setAttribute('key', '')
      return
    case 'EGenericType':
      // A typed element's type moves into its new generic type, as EMF keeps the two in step.
      if (spec.tag === 'eGenericType' && parent.hasAttribute('eType')) {
        el.setAttribute('eClassifier', parent.getAttribute('eType') ?? '')
        parent.removeAttribute('eType')
      }
      return
  }
}

/** Adds a new child to `parent` (after `after`, when it is a sibling of the same kind) and returns where it is. */
export function createChild(d: EditDocs, parent: ElementRef, spec: NewChildSpec, after?: ElementRef): ElementRef {
  const doc = d.doc(parent.key)
  const container = elementOf(d, parent)
  const el = createElement(doc!, spec.tag, spec.xsiType)
  initialise(d, parent.key, container, el, spec)
  const sibling = after && elementOf(d, after)
  const before =
    sibling && sibling.parentElement === container && sibling.localName === spec.tag
      ? sibling.nextElementSibling
      : insertionPoint(container, spec.tag)
  insertChild(container, el, before)
  return { key: parent.key, path: pathOf(el) }
}

/** Copies an element, renamed so it does not clash, just after the original. */
export function duplicate(d: EditDocs, ref: ElementRef): ElementRef {
  const el = elementOf(d, ref)
  const parent = el.parentElement
  if (!parent) return ref
  const copy = el.cloneNode(true) as Element
  const name = el.getAttribute('name')
  if (name) copy.setAttribute('name', uniqueName(parent, el.localName, name, true))
  // A copied reference cannot share its original's opposite.
  copy.removeAttribute('eOpposite')
  insertChild(parent, copy, el.nextElementSibling)
  return { key: ref.key, path: pathOf(copy) }
}

/** Deletes an element and returns what to select next: the next sibling, else the previous, else the parent. */
export function remove(d: EditDocs, ref: ElementRef): ElementRef | null {
  if (!ref.path.length) return null
  const el = elementOf(d, ref)
  const parent = el.parentElement!
  const next = el.nextElementSibling ?? el.previousElementSibling
  withRefactor(ref.key, d.files, d.doc, () => removeElement(el))
  return { key: ref.key, path: pathOf(next ?? parent) }
}

/** Moves an element into `parent`, before `before` or last. Moves stay within one file. */
export function move(d: EditDocs, ref: ElementRef, parent: ElementRef, before: ElementRef | null): ElementRef {
  if (parent.key !== ref.key) throw new Error('Elements can only be moved within their own file.')
  const el = elementOf(d, ref)
  const container = elementOf(d, parent)
  const anchor = before ? elementOf(d, before) : null
  if (el === container || el.contains(container) || anchor === el) return ref
  withRefactor(ref.key, d.files, d.doc, () => moveElement(el, container, anchor))
  return { key: ref.key, path: pathOf(el) }
}

/** Moves an element up (-1) or down (1) among its siblings of the same kind. */
export function shift(d: EditDocs, ref: ElementRef, delta: -1 | 1): ElementRef {
  const el = elementOf(d, ref)
  const parent = el.parentElement
  if (!parent) return ref
  const siblings = Array.from(parent.children).filter((c) => c.localName === el.localName)
  const target = siblings[siblings.indexOf(el) + delta]
  if (!target) return ref
  moveElement(el, parent, delta < 0 ? target : target.nextElementSibling)
  return { key: ref.key, path: pathOf(el) }
}

/** Sets or clears an attribute. A name change carries every reference to the element along with it. */
export function setAttribute(d: EditDocs, ref: ElementRef, attr: string, value: string | null) {
  const el = elementOf(d, ref)
  withRefactor(ref.key, d.files, d.doc, () => setAttr(el, attr, value))
}

/** EMF leaves out attributes at their default, so a flag set back to its default is removed. */
export function setFlag(d: EditDocs, ref: ElementRef, attr: string, value: boolean, def: boolean) {
  setAttr(elementOf(d, ref), attr, value === def ? null : String(value))
}

export function setMultiplicity(d: EditDocs, ref: ElementRef, lower: number, upper: number) {
  const el = elementOf(d, ref)
  setAttr(el, 'lowerBound', lower === 0 ? null : String(lower))
  setAttr(el, 'upperBound', upper === 1 ? null : String(upper))
}

export function setType(d: EditDocs, ref: ElementRef, choice: TypeChoice) {
  const el = elementOf(d, ref)
  for (const generic of Array.from(el.children).filter((c) => c.localName === 'eGenericType')) removeElement(generic)
  if (!choice) {
    el.removeAttribute('eType')
    return
  }
  if (choice.kind === 'typeParameter') {
    el.removeAttribute('eType')
    const generic = createElement(d.doc(ref.key)!, 'eGenericType')
    generic.setAttribute('eTypeParameter', `#${choice.fragment}`)
    insertChild(el, generic, null)
    return
  }
  el.setAttribute('eType', refTo(fileOf(d, ref.key), choice, d.files, true))
}

/** Writes a list of references, such as supertypes or exceptions, in the given order. */
export function setRefList(d: EditDocs, ref: ElementRef, attr: string, choices: RefChoice[], typed: boolean) {
  const from = fileOf(d, ref.key)
  const tokens = choices.map((c) => refTo(from, c, d.files, typed))
  setAttr(elementOf(d, ref), attr, tokens.length ? tokens.join(' ') : null)
}

export function setClassifierRef(d: EditDocs, ref: ElementRef, attr: string, choice: RefChoice | null) {
  const from = fileOf(d, ref.key)
  setAttr(elementOf(d, ref), attr, choice ? refTo(from, choice, d.files, true) : null)
}

/** Clears `el`'s opposite, and the partner's too when it pointed back. */
function unpair(d: EditDocs, file: RefFile, el: Element) {
  const token = el.getAttribute('eOpposite')
  el.removeAttribute('eOpposite')
  if (!token) return
  const partner = resolveToken(file, token, d.files, d.doc)
  const back = partner?.el.getAttribute('eOpposite')
  if (partner && back && resolveToken(partner.file, back, d.files, d.doc)?.el === el) {
    partner.el.removeAttribute('eOpposite')
  }
}

/**
 * Pairs two references as each other's opposite, or clears the pairing. Eclipse sets each side by hand;
 * here both sides follow, and any earlier partners are released.
 */
export function setOpposite(d: EditDocs, ref: ElementRef, target: { fileKey: string; fragment: string } | null) {
  const file = fileOf(d, ref.key)
  const el = elementOf(d, ref)
  unpair(d, file, el)
  if (!target) return
  const targetFile = fileOf(d, target.fileKey)
  const targetDoc = d.doc(target.fileKey)
  const partner = targetDoc && elementForFragment(targetDoc, target.fragment)
  const own = fragmentOf(el)
  if (!partner || partner === el || own === null) return
  unpair(d, targetFile, partner)
  el.setAttribute('eOpposite', refTo(file, { kind: 'element', fileKey: target.fileKey, fragment: target.fragment, eKind: 'EReference' }, d.files, false))
  partner.setAttribute('eOpposite', refTo(targetFile, { kind: 'element', fileKey: ref.key, fragment: own, eKind: 'EReference' }, d.files, false))
}
