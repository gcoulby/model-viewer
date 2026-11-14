import { ECORE_NAMESPACE } from '@/data/ecoreNamespace'
import { dirOf, hasScheme, normalisePath, resolveRelative } from '@/lib/ecore/paths'
import { kindOf, type EKind } from './kinds'

/** An open file as the reference code needs it. */
export interface RefFile {
  key: string
  name: string
  index: number
  text: string
}

/** Attributes that hold references, as space-separated `uri#fragment` tokens. */
export const REF_ATTRS = [
  'eType',
  'eSuperTypes',
  'eOpposite',
  'eKeys',
  'eExceptions',
  'eClassifier',
  'eTypeParameter',
  'references',
] as const

/** Attributes holding a single reference. A deleted target leaves these dangling rather than silently cleared. */
const SINGLE_KEEP = new Set(['eType', 'eClassifier', 'eTypeParameter'])

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

const CLASSIFIERS = new Set<EKind>(['EClass', 'EDataType', 'EEnum'])

export const isClassifierKind = (kind: EKind | null) => !!kind && CLASSIFIERS.has(kind)

function rootPackages(doc: Document): Element[] {
  const root = doc.documentElement
  return root.localName === 'EPackage' ? [root] : Array.from(root.children).filter((c) => c.localName === 'EPackage')
}

/**
 * The URI fragment EMF uses for an element (`//Library/books`), or null for one that is not referred to by
 * name. With `parsed`, empty names read as the parser reads them, which gives the ids the diagram uses.
 */
function segmentPath(el: Element, parsed: boolean): string | null {
  const kind = kindOf(el)
  if (el.localName === 'EPackage' && (!el.parentElement || el.parentElement === el.ownerDocument.documentElement)) {
    const index = rootPackages(el.ownerDocument).indexOf(el)
    return index <= 0 ? '/' : `/${index}`
  }
  const parent = el.parentElement
  if (!parent || !kind) return null
  const parentPath = segmentPath(parent, parsed)
  if (parentPath === null) return null
  if (kind === 'EAnnotation') return parsed ? null : `${parentPath}/%${el.getAttribute('source') ?? ''}%`
  if (!NAMED.has(kind)) return null
  const name = el.getAttribute('name') ?? ''
  if (!parsed) return `${parentPath}/${name}`
  // The parser names an unnamed subpackage "?" and anything else "(unnamed)".
  return `${parentPath}/${name || (kind === 'EPackage' ? '?' : '(unnamed)')}`
}

export const fragmentOf = (el: Element) => segmentPath(el, false)

/** The id the diagram gives a classifier, or null for anything else. */
export function graphIdOf(index: number, el: Element): string | null {
  if (!isClassifierKind(kindOf(el))) return null
  const path = segmentPath(el, true)
  if (path === null) return null
  // As the parser does, a classifier sharing its name with earlier siblings is numbered from `~2`.
  const name = el.getAttribute('name') ?? ''
  let occurrence = 1
  for (let s = el.previousElementSibling; s; s = s.previousElementSibling) {
    if (s.localName === 'eClassifiers' && (s.getAttribute('name') ?? '') === name) occurrence++
  }
  return `${index}|${path}${occurrence > 1 ? `~${occurrence}` : ''}`
}

/** The nearest classifier at or above `el`, which is what the diagram selects for it. */
export function enclosingClassifier(el: Element): Element | null {
  for (let current: Element | null = el; current; current = current.parentElement) {
    if (isClassifierKind(kindOf(current))) return current
  }
  return null
}

function walk(doc: Document, visit: (el: Element) => void) {
  const stack: Element[] = [doc.documentElement]
  while (stack.length) {
    const el = stack.pop()!
    visit(el)
    for (let i = el.children.length - 1; i >= 0; i--) stack.push(el.children[i]!)
  }
}

/** Every classifier's diagram id, keyed by element, so ids can be followed through an edit. */
export function classifierIds(doc: Document, index: number): Map<Element, string> {
  const ids = new Map<Element, string>()
  walk(doc, (el) => {
    const id = graphIdOf(index, el)
    if (id) ids.set(el, id)
  })
  return ids
}

/** The element a diagram path (`//Library`, `//Library~2` or `//Library/books`) names. */
export function elementForPath(doc: Document, path: string): Element | null {
  const numbered = path.match(/^(.*)~(\d+)$/)
  const plain = numbered ? numbered[1]! : path
  let skip = numbered ? Number(numbered[2]) - 1 : 0
  let found: Element | null = null
  walk(doc, (el) => {
    if (found || segmentPath(el, true) !== plain) return
    if (skip-- === 0) found = el
  })
  return found
}

export function elementForFragment(doc: Document, fragment: string): Element | null {
  let found: Element | null = null
  walk(doc, (el) => {
    if (!found && fragmentOf(el) === fragment) found = el
  })
  return found
}

function fragments(doc: Document): Map<Element, string> {
  const map = new Map<Element, string>()
  walk(doc, (el) => {
    const fragment = fragmentOf(el)
    if (fragment !== null) map.set(el, fragment)
  })
  return map
}

export function splitToken(token: string): { uri: string; fragment: string } {
  const hash = token.indexOf('#')
  return hash < 0 ? { uri: '', fragment: token } : { uri: token.slice(0, hash), fragment: token.slice(hash + 1) }
}

/** The reference tokens of an attribute, without the `ecore:EClass` type prefixes some carry. */
export function refTokens(value: string | null): string[] {
  return (value ?? '').trim().split(/\s+/).filter((t) => t && !/^ecore:E\w+$/.test(t))
}

export function relativePath(fromDir: string, to: string): string {
  const from = fromDir ? fromDir.split('/') : []
  const target = normalisePath(to).split('/')
  let common = 0
  while (common < from.length && common < target.length - 1 && from[common]?.toLowerCase() === target[common]?.toLowerCase()) {
    common++
  }
  return [...from.slice(common).map(() => '..'), ...target.slice(common)].join('/')
}

function nsURIsOf(file: RefFile): string[] {
  return Array.from(file.text.matchAll(/\bnsURI="([^"]*)"/g), (m) => m[1] ?? '')
}

/** The open file a token's URI names, seen from `from`. An empty URI is `from` itself. */
export function targetFile(from: RefFile, uri: string, files: RefFile[]): RefFile | null {
  if (!uri) return from
  if (uri.includes(ECORE_NAMESPACE)) return null
  if (!hasScheme(uri)) {
    const key = resolveRelative(dirOf(from.name), uri).toLowerCase()
    const exact = files.find((f) => f.key === key)
    if (exact) return exact
  }
  return files.find((f) => nsURIsOf(f).includes(uri)) ?? null
}

/** What a type or reference field can point at. */
export type RefChoice =
  | { kind: 'element'; fileKey: string; fragment: string; eKind: EKind }
  | { kind: 'builtin'; name: string; eKind: 'EClass' | 'EDataType' }

/**
 * The token that refers to `choice` from file `from`: `#//Name` in the same file, a relative path for
 * another open file, the Ecore namespace for built-in types. `typed` adds the `ecore:EClass` prefix EMF
 * writes when the attribute's declared type is abstract (eType, eClassifier) and the target is elsewhere.
 */
export function refTo(from: RefFile, choice: RefChoice, files: RefFile[], typed: boolean): string {
  if (choice.kind === 'builtin') {
    const token = `http://${ECORE_NAMESPACE}#//${choice.name}`
    return typed ? `ecore:${choice.eKind} ${token}` : token
  }
  if (choice.fileKey === from.key) return `#${choice.fragment}`
  const target = files.find((f) => f.key === choice.fileKey)
  const token = `${relativePath(dirOf(from.name), target?.name ?? choice.fileKey)}#${choice.fragment}`
  return typed ? `ecore:${choice.eKind} ${token}` : token
}

/** Finds the element a token points at, in whichever open file holds it. */
export function resolveToken(
  from: RefFile,
  token: string,
  files: RefFile[],
  doc: (key: string) => Document | null,
): { file: RefFile; el: Element } | null {
  const { uri, fragment } = splitToken(token)
  const file = targetFile(from, uri, files)
  const target = file && doc(file.key)
  const el = target && elementForFragment(target, fragment)
  return file && el ? { file, el } : null
}

/**
 * Runs `mutate` on file `key`'s document, then rewrites every reference, in every open file, to an element
 * whose fragment the change moved: renamed, moved to another container or deleted. References to a deleted
 * element are dropped from lists and opposites but left dangling in types, where a problem report finds them.
 */
export function withRefactor<T>(
  key: string,
  files: RefFile[],
  doc: (key: string) => Document | null,
  mutate: (doc: Document) => T,
): T {
  const target = doc(key)
  const file = files.find((f) => f.key === key)
  if (!target || !file) throw new Error(`No open file ${key}`)
  const before = fragments(target)
  const result = mutate(target)
  const after = fragments(target)
  const moved = new Map<string, string | null>()
  for (const [el, fragment] of before) {
    const now = after.get(el) ?? null
    if (now !== fragment) moved.set(fragment, now)
  }
  // A fragment another element still holds (a rename onto an existing name) keeps pointing there.
  const held = new Set(after.values())
  for (const fragment of [...moved.keys()]) if (moved.get(fragment) === null && held.has(fragment)) moved.delete(fragment)
  if (!moved.size) return result

  const old = [...moved.keys()]
  for (const other of files) {
    if (other.key !== key && !old.some((f) => other.text.includes(f))) continue
    const otherDoc = doc(other.key)
    if (otherDoc) rewrite(otherDoc, other, file, files, moved)
  }
  return result
}

function rewrite(doc: Document, from: RefFile, target: RefFile, files: RefFile[], moved: Map<string, string | null>) {
  walk(doc, (el) => {
    for (const attr of REF_ATTRS) {
      const value = el.getAttribute(attr)
      if (!value) continue
      const parts = value.trim().split(/\s+/)
      let changed = false
      const out: string[] = []
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]!
        if (/^ecore:E\w+$/.test(part)) {
          out.push(part)
          continue
        }
        const { uri, fragment } = splitToken(part)
        const hit = moved.has(fragment) && targetFile(from, uri, files)?.key === target.key
        if (!hit) {
          out.push(part)
          continue
        }
        const next = moved.get(fragment) ?? null
        changed = true
        if (next !== null) out.push(`${uri}#${next}`)
        else if (SINGLE_KEEP.has(attr)) out.push(part)
        else if (/^ecore:E\w+$/.test(out[out.length - 1] ?? '')) out.pop()
      }
      if (!changed) continue
      if (out.length) el.setAttribute(attr, out.join(' '))
      else el.removeAttribute(attr)
    }
  })
}

/** The items of a reference list, each with the `ecore:EClass` prefix it carries, if any, kept attached. */
export function refItems(value: string | null): string[] {
  const items: string[] = []
  let prefix = ''
  for (const part of (value ?? '').trim().split(/\s+/)) {
    if (!part) continue
    if (/^ecore:E\w+$/.test(part)) {
      prefix = `${part} `
      continue
    }
    items.push(prefix + part)
    prefix = ''
  }
  return items
}
