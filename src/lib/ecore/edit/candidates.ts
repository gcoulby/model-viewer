import { ECORE_CLASSES, ECORE_DATA_TYPES } from './builtins'
import { kindOf, type EKind, type TypeFilter } from './kinds'
import { fragmentOf, refTokens, resolveToken, type RefChoice, type RefFile } from './refs'

/** Something a type field can be set to, with what the picker shows for it. */
export interface TypeCandidate {
  choice: RefChoice
  name: string
  /** Where it comes from: its package, or "Ecore". */
  where: string
  /** The open file it is in, or null for a built-in type. */
  fileKey: string | null
  eKind: EKind
}

function walkClassifiers(doc: Document, visit: (el: Element, pkg: string) => void) {
  const visitPackage = (pkg: Element, prefix: string) => {
    const name = pkg.getAttribute('name') ?? ''
    const full = prefix ? `${prefix}.${name}` : name
    for (const child of Array.from(pkg.children)) {
      if (child.localName === 'eClassifiers') visit(child, full)
      else if (child.localName === 'eSubpackages') visitPackage(child, full)
    }
  }
  const root = doc.documentElement
  const roots = root.localName === 'EPackage' ? [root] : Array.from(root.children).filter((c) => c.localName === 'EPackage')
  for (const pkg of roots) visitPackage(pkg, '')
}

/** Every classifier in the open files, then Ecore's own types. */
export function typeCandidates(files: RefFile[], docs: ReadonlyMap<string, Document>): TypeCandidate[] {
  const out: TypeCandidate[] = []
  for (const file of files) {
    const doc = docs.get(file.key)
    if (!doc) continue
    walkClassifiers(doc, (el, pkg) => {
      const eKind = kindOf(el)
      const fragment = fragmentOf(el)
      if (!eKind || fragment === null) return
      out.push({
        choice: { kind: 'element', fileKey: file.key, fragment, eKind },
        name: el.getAttribute('name') ?? '',
        where: pkg,
        fileKey: file.key,
        eKind,
      })
    })
  }
  for (const name of ECORE_DATA_TYPES) {
    out.push({ choice: { kind: 'builtin', name, eKind: 'EDataType' }, name, where: 'Ecore', fileKey: null, eKind: 'EDataType' })
  }
  for (const name of ECORE_CLASSES) {
    out.push({ choice: { kind: 'builtin', name, eKind: 'EClass' }, name, where: 'Ecore', fileKey: null, eKind: 'EClass' })
  }
  return out
}

export function fitsFilter(eKind: EKind, filter: TypeFilter): boolean {
  if (filter === 'class') return eKind === 'EClass'
  if (filter === 'datatype') return eKind === 'EDataType' || eKind === 'EEnum'
  return true
}

/** The type parameters a typed element can use: those of its operation and of its classifier. */
export function typeParametersInScope(el: Element): { name: string; fragment: string }[] {
  const out: { name: string; fragment: string }[] = []
  for (let current: Element | null = el; current; current = current.parentElement) {
    const kind = kindOf(current)
    if (kind !== 'EOperation' && kind !== 'EClass' && kind !== 'EDataType' && kind !== 'EEnum') continue
    for (const child of Array.from(current.children)) {
      if (child.localName !== 'eTypeParameters') continue
      const fragment = fragmentOf(child)
      if (fragment !== null) out.push({ name: child.getAttribute('name') ?? '', fragment })
    }
  }
  return out
}

export interface FeatureCandidate {
  fileKey: string
  fragment: string
  name: string
  /** The feature's type name, shown beside it. */
  detail: string
}

/** The class a typed element's `eType` points at, if it is in an open file. */
export function typeElement(
  file: RefFile,
  el: Element,
  files: RefFile[],
  docs: ReadonlyMap<string, Document>,
): { file: RefFile; el: Element } | null {
  const generic = Array.from(el.children).find((c) => c.localName === 'eGenericType')
  const [token] = refTokens(generic ? generic.getAttribute('eClassifier') : el.getAttribute('eType'))
  return token ? resolveToken(file, token, files, (key) => docs.get(key) ?? null) : null
}

function features(of: { file: RefFile; el: Element }, kind: 'EReference' | 'EAttribute'): FeatureCandidate[] {
  return Array.from(of.el.children).flatMap((child) => {
    const fragment = fragmentOf(child)
    if (kindOf(child) !== kind || fragment === null) return []
    const [type] = refTokens(child.getAttribute('eType'))
    return [{ fileKey: of.file.key, fragment, name: child.getAttribute('name') ?? '', detail: type?.split('/').pop() ?? '' }]
  })
}

/** References that can be this reference's opposite: those in its type that point back at its class. */
export function oppositeCandidates(
  file: RefFile,
  el: Element,
  files: RefFile[],
  docs: ReadonlyMap<string, Document>,
): FeatureCandidate[] | null {
  const target = typeElement(file, el, files, docs)
  if (!target) return null
  const owner = el.parentElement
  const lookup = (key: string) => docs.get(key) ?? null
  return features(target, 'EReference').filter((candidate) => {
    const candidateDoc = docs.get(candidate.fileKey)
    const candidateEl = candidateDoc && Array.from(target.el.children).find((c) => fragmentOf(c) === candidate.fragment)
    if (!candidateEl || candidateEl === el) return false
    const [back] = refTokens(candidateEl.getAttribute('eType'))
    return !!back && resolveToken(target.file, back, files, lookup)?.el === owner
  })
}

/** Attributes of a reference's type, which can serve as its keys. */
export function keyCandidates(
  file: RefFile,
  el: Element,
  files: RefFile[],
  docs: ReadonlyMap<string, Document>,
): FeatureCandidate[] | null {
  const target = typeElement(file, el, files, docs)
  return target ? features(target, 'EAttribute') : null
}
