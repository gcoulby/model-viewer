import { NEW_CHILDREN, type EKind, type NewChildSpec } from './kinds'

/** A list of an element's contents shown in its Properties panel: which children, and how to add one. */
export interface ContentsGroup {
  title: string
  tag: string
  /** Narrows a tag that holds several kinds, such as attributes and references in `eStructuralFeatures`. */
  kind?: EKind
}

/** The lists each kind shows. What is listed here is left out of "Add inside", as each list adds its own. */
export const CONTENTS: Partial<Record<EKind, ContentsGroup[]>> = {
  EClass: [
    { title: 'Attributes', tag: 'eStructuralFeatures', kind: 'EAttribute' },
    { title: 'References', tag: 'eStructuralFeatures', kind: 'EReference' },
    { title: 'Operations', tag: 'eOperations' },
  ],
  EEnum: [{ title: 'Literals', tag: 'eLiterals' }],
  EOperation: [{ title: 'Parameters', tag: 'eParameters' }],
  EPackage: [
    { title: 'Classifiers', tag: 'eClassifiers' },
    { title: 'Subpackages', tag: 'eSubpackages' },
  ],
  EAnnotation: [{ title: 'Details', tag: 'details' }],
}

export function groupSpecs(kind: EKind, group: ContentsGroup): NewChildSpec[] {
  return NEW_CHILDREN[kind].filter((s) => s.tag === group.tag && (!group.kind || s.kind === group.kind))
}
