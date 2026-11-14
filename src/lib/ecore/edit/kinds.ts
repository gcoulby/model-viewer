/**
 * What each Ecore element is, what it may contain and which of its attributes can be edited. The tree's
 * "New child" menus and the Properties panel are both built from this, so together they cover all of Ecore.
 */

export type EKind =
  | 'EPackage'
  | 'EClass'
  | 'EDataType'
  | 'EEnum'
  | 'EEnumLiteral'
  | 'EAttribute'
  | 'EReference'
  | 'EOperation'
  | 'EParameter'
  | 'EAnnotation'
  | 'EStringToStringMapEntry'
  | 'ETypeParameter'
  | 'EGenericType'

export const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance'
export const ECORE_NS = 'http://www.eclipse.org/emf/2002/Ecore'
export const XMLNS_NS = 'http://www.w3.org/2000/xmlns/'

const GENERIC_TAGS = new Set([
  'eGenericType',
  'eGenericSuperTypes',
  'eGenericExceptions',
  'eBounds',
  'eTypeArguments',
  'eUpperBound',
  'eLowerBound',
])

export function xsiTypeOf(el: Element): string {
  const t = el.getAttribute('xsi:type') ?? ''
  return t.includes(':') ? (t.split(':').pop() ?? '') : t
}

/** The Ecore kind of an element, or null for anything Ecore does not define (such as annotation contents). */
export function kindOf(el: Element): EKind | null {
  const xsi = xsiTypeOf(el)
  switch (el.localName) {
    case 'EPackage':
    case 'eSubpackages':
      return 'EPackage'
    case 'eClassifiers':
      return xsi === 'EDataType' || xsi === 'EEnum' ? xsi : 'EClass'
    case 'eStructuralFeatures':
      if (xsi === 'EReference' || xsi === 'EAttribute') return xsi
      return el.hasAttribute('containment') || el.hasAttribute('eOpposite') ? 'EReference' : 'EAttribute'
    case 'eOperations':
      return 'EOperation'
    case 'eParameters':
      return 'EParameter'
    case 'eLiterals':
      return 'EEnumLiteral'
    case 'eAnnotations':
      return 'EAnnotation'
    case 'details':
      return el.parentElement?.localName === 'eAnnotations' ? 'EStringToStringMapEntry' : null
    case 'eTypeParameters':
      return 'ETypeParameter'
  }
  return GENERIC_TAGS.has(el.localName) ? 'EGenericType' : null
}

export const KIND_LABEL: Record<EKind, string> = {
  EPackage: 'Package',
  EClass: 'Class',
  EDataType: 'Data type',
  EEnum: 'Enum',
  EEnumLiteral: 'Literal',
  EAttribute: 'Attribute',
  EReference: 'Reference',
  EOperation: 'Operation',
  EParameter: 'Parameter',
  EAnnotation: 'Annotation',
  EStringToStringMapEntry: 'Details entry',
  ETypeParameter: 'Type parameter',
  EGenericType: 'Generic type',
}

/** The one-letter badge each kind shows in the tree. */
export const KIND_LETTER: Record<EKind, string> = {
  EPackage: 'P',
  EClass: 'C',
  EDataType: 'D',
  EEnum: 'E',
  EEnumLiteral: 'L',
  EAttribute: 'a',
  EReference: 'r',
  EOperation: 'o',
  EParameter: 'p',
  EAnnotation: '@',
  EStringToStringMapEntry: '·',
  ETypeParameter: 'T',
  EGenericType: 'G',
}

/** A containment feature: the tag its children are written with and the kinds it holds. */
export interface ChildFeature {
  tag: string
  many: boolean
}

const ann: ChildFeature = { tag: 'eAnnotations', many: true }
const typeParams: ChildFeature = { tag: 'eTypeParameters', many: true }
const genericType: ChildFeature = { tag: 'eGenericType', many: false }

/** Each kind's containment features in the order Eclipse writes them. New children go in this order. */
export const FEATURES: Record<EKind, ChildFeature[]> = {
  EPackage: [ann, { tag: 'eClassifiers', many: true }, { tag: 'eSubpackages', many: true }],
  EClass: [
    ann,
    typeParams,
    { tag: 'eOperations', many: true },
    { tag: 'eStructuralFeatures', many: true },
    { tag: 'eGenericSuperTypes', many: true },
  ],
  EDataType: [ann, typeParams],
  EEnum: [ann, typeParams, { tag: 'eLiterals', many: true }],
  EEnumLiteral: [ann],
  EAttribute: [ann, genericType],
  EReference: [ann, genericType],
  EOperation: [
    ann,
    typeParams,
    { tag: 'eParameters', many: true },
    { tag: 'eGenericExceptions', many: true },
    genericType,
  ],
  EParameter: [ann, genericType],
  EAnnotation: [ann, { tag: 'details', many: true }, { tag: 'contents', many: true }],
  EStringToStringMapEntry: [],
  ETypeParameter: [ann, { tag: 'eBounds', many: true }],
  EGenericType: [
    { tag: 'eUpperBound', many: false },
    { tag: 'eTypeArguments', many: true },
    { tag: 'eLowerBound', many: false },
  ],
}

/** One entry of a "New child" menu. */
export interface NewChildSpec {
  label: string
  tag: string
  kind: EKind
  /** Written as `xsi:type="ecore:<xsiType>"`. */
  xsiType?: string
}

const C = (label: string, tag: string, kind: EKind, xsiType?: string): NewChildSpec => ({ label, tag, kind, xsiType })
const ANNOTATION = C('Annotation', 'eAnnotations', 'EAnnotation')
const TYPE_PARAMETER = C('Type parameter', 'eTypeParameters', 'ETypeParameter')
const GENERIC_TYPE = C('Generic type', 'eGenericType', 'EGenericType')

/** What can be added inside each kind, in menu order. Single-valued features already filled are left out. */
export const NEW_CHILDREN: Record<EKind, NewChildSpec[]> = {
  EPackage: [
    C('Class', 'eClassifiers', 'EClass', 'EClass'),
    C('Enum', 'eClassifiers', 'EEnum', 'EEnum'),
    C('Data type', 'eClassifiers', 'EDataType', 'EDataType'),
    C('Subpackage', 'eSubpackages', 'EPackage'),
    ANNOTATION,
  ],
  EClass: [
    C('Attribute', 'eStructuralFeatures', 'EAttribute', 'EAttribute'),
    C('Reference', 'eStructuralFeatures', 'EReference', 'EReference'),
    C('Operation', 'eOperations', 'EOperation'),
    TYPE_PARAMETER,
    C('Generic supertype', 'eGenericSuperTypes', 'EGenericType'),
    ANNOTATION,
  ],
  EDataType: [TYPE_PARAMETER, ANNOTATION],
  EEnum: [C('Literal', 'eLiterals', 'EEnumLiteral'), TYPE_PARAMETER, ANNOTATION],
  EEnumLiteral: [ANNOTATION],
  EAttribute: [GENERIC_TYPE, ANNOTATION],
  EReference: [GENERIC_TYPE, ANNOTATION],
  EOperation: [
    C('Parameter', 'eParameters', 'EParameter'),
    TYPE_PARAMETER,
    C('Exception (generic)', 'eGenericExceptions', 'EGenericType'),
    GENERIC_TYPE,
    ANNOTATION,
  ],
  EParameter: [GENERIC_TYPE, ANNOTATION],
  EAnnotation: [C('Details entry', 'details', 'EStringToStringMapEntry'), ANNOTATION],
  EStringToStringMapEntry: [],
  ETypeParameter: [C('Bound', 'eBounds', 'EGenericType')],
  EGenericType: [
    C('Type argument', 'eTypeArguments', 'EGenericType'),
    C('Upper bound', 'eUpperBound', 'EGenericType'),
    C('Lower bound', 'eLowerBound', 'EGenericType'),
  ],
}

/** The menu entries that fit in `el` now, leaving out single-valued features that are already set. */
export function newChildrenOf(el: Element): NewChildSpec[] {
  const kind = kindOf(el)
  if (!kind) return []
  const single = new Set(FEATURES[kind].filter((f) => !f.many).map((f) => f.tag))
  const taken = new Set(Array.from(el.children, (c) => c.localName))
  return NEW_CHILDREN[kind].filter((spec) => !(single.has(spec.tag) && taken.has(spec.tag)))
}

/** True when an element of `kind` written as `tag` may sit in `parent`. Used to check drops. */
export function canContain(parent: Element, tag: string): boolean {
  const kind = kindOf(parent)
  if (!kind) return false
  const feature = FEATURES[kind].find((f) => f.tag === tag)
  if (!feature) return false
  return feature.many || !Array.from(parent.children).some((c) => c.localName === tag)
}

/** Which kinds of classifier a type field may point at. */
export type TypeFilter = 'any' | 'class' | 'datatype'

export type PropSpec =
  | { type: 'text'; attr: string; label: string; placeholder?: string; mono?: boolean; multiline?: boolean }
  | { type: 'bool'; attr: string; label: string; def: boolean; hint?: string }
  | { type: 'int'; attr: string; label: string; def: number }
  | { type: 'multiplicity' }
  | { type: 'type'; label: string; filter: TypeFilter; optional: boolean }
  | { type: 'classifier'; attr: string; label: string }
  | { type: 'refs'; attr: string; label: string; filter: TypeFilter }
  | { type: 'opposite' }
  | { type: 'keys' }
  | { type: 'typeParameter' }
  | { type: 'raw'; attr: string; label: string }

export interface PropSection {
  title: string
  props: PropSpec[]
}

const NAME: PropSpec = { type: 'text', attr: 'name', label: 'Name' }
const typed = (filter: TypeFilter, optional: boolean): PropSection => ({
  title: 'Type',
  props: [{ type: 'type', label: 'Type', filter, optional }, { type: 'multiplicity' }],
})
const ordering: PropSpec[] = [
  { type: 'bool', attr: 'ordered', label: 'Ordered', def: true },
  { type: 'bool', attr: 'unique', label: 'Unique', def: true },
]
const featureFlags: PropSpec[] = [
  { type: 'bool', attr: 'changeable', label: 'Changeable', def: true },
  { type: 'bool', attr: 'derived', label: 'Derived', def: false },
  { type: 'bool', attr: 'transient', label: 'Transient', def: false },
  { type: 'bool', attr: 'volatile', label: 'Volatile', def: false },
  { type: 'bool', attr: 'unsettable', label: 'Unsettable', def: false },
  ...ordering,
]
const defaultValue: PropSpec = {
  type: 'text',
  attr: 'defaultValueLiteral',
  label: 'Default value',
  mono: true,
}
const instanceClass: PropSpec = {
  type: 'text',
  attr: 'instanceClassName',
  label: 'Instance class',
  placeholder: 'e.g. java.util.Date',
  mono: true,
}

/** The Properties panel's sections for each kind, grouped as Eclipse's property sheet groups them. */
export const PROPERTIES: Record<EKind, PropSection[]> = {
  EPackage: [
    {
      title: 'Package',
      props: [
        NAME,
        { type: 'text', attr: 'nsURI', label: 'Namespace URI', mono: true, placeholder: 'http://www.example.org/name' },
        { type: 'text', attr: 'nsPrefix', label: 'Namespace prefix', mono: true },
      ],
    },
  ],
  EClass: [
    {
      title: 'Class',
      props: [
        NAME,
        { type: 'bool', attr: 'abstract', label: 'Abstract', def: false },
        { type: 'bool', attr: 'interface', label: 'Interface', def: false },
      ],
    },
    { title: 'Supertypes', props: [{ type: 'refs', attr: 'eSuperTypes', label: 'Supertypes', filter: 'class' }] },
    { title: 'Advanced', props: [instanceClass] },
  ],
  EDataType: [
    {
      title: 'Data type',
      props: [NAME, instanceClass, { type: 'bool', attr: 'serializable', label: 'Serializable', def: true }],
    },
  ],
  EEnum: [
    {
      title: 'Enum',
      props: [NAME, { type: 'bool', attr: 'serializable', label: 'Serializable', def: true }],
    },
    { title: 'Advanced', props: [instanceClass] },
  ],
  EEnumLiteral: [
    {
      title: 'Literal',
      props: [
        NAME,
        { type: 'int', attr: 'value', label: 'Value', def: 0 },
        { type: 'text', attr: 'literal', label: 'Literal', placeholder: 'Same as the name', mono: true },
      ],
    },
  ],
  EAttribute: [
    { title: 'Attribute', props: [NAME, { type: 'bool', attr: 'iD', label: 'ID', def: false }, defaultValue] },
    typed('datatype', false),
    { title: 'Behaviour', props: featureFlags },
  ],
  EReference: [
    {
      title: 'Reference',
      props: [
        NAME,
        { type: 'bool', attr: 'containment', label: 'Containment', def: false },
        { type: 'opposite' },
        { type: 'keys' },
      ],
    },
    typed('class', false),
    {
      title: 'Behaviour',
      props: [...featureFlags, { type: 'bool', attr: 'resolveProxies', label: 'Resolve proxies', def: true }, defaultValue],
    },
  ],
  EOperation: [
    { title: 'Operation', props: [NAME] },
    { ...typed('any', true), title: 'Return type' },
    { title: 'Exceptions', props: [{ type: 'refs', attr: 'eExceptions', label: 'Exceptions', filter: 'any' }] },
    { title: 'Behaviour', props: ordering },
  ],
  EParameter: [
    { title: 'Parameter', props: [NAME] },
    typed('any', false),
    { title: 'Behaviour', props: ordering },
  ],
  EAnnotation: [
    {
      title: 'Annotation',
      props: [
        { type: 'text', attr: 'source', label: 'Source', mono: true, placeholder: 'http://www.eclipse.org/emf/2002/GenModel' },
        { type: 'raw', attr: 'references', label: 'References' },
      ],
    },
  ],
  EStringToStringMapEntry: [
    {
      title: 'Details entry',
      props: [
        { type: 'text', attr: 'key', label: 'Key', mono: true },
        { type: 'text', attr: 'value', label: 'Value', multiline: true },
      ],
    },
  ],
  ETypeParameter: [{ title: 'Type parameter', props: [NAME] }],
  EGenericType: [
    {
      title: 'Generic type',
      props: [{ type: 'classifier', attr: 'eClassifier', label: 'Classifier' }, { type: 'typeParameter' }],
    },
  ],
}
