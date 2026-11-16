import { buildGraph } from '@/lib/ecore/buildGraph'
import type { ManualLinks } from '@/lib/ecore/resolve'
import type { ParsedAttribute, ParsedModel, ParsedPackage, ParsedReference } from '@/types/ecore'
import type { ClassGraphNode, ModelGraph } from '@/types/graph'

/** How an attribute's values are entered and checked. */
export type ValueKind = 'string' | 'int' | 'float' | 'boolean' | 'date' | 'enum'

export interface MetaFeature {
  name: string
  kind: 'attribute' | 'reference'
  lower: number
  /** -1 for unbounded. */
  upper: number
  many: boolean
  containment: boolean
  /** Diagram id of the type when it is a loaded class, enum or data type. */
  typeId: string | null
  typeName: string
  valueKind: ValueKind
  /** Literal names, for an enum-typed attribute. */
  literals: string[]
  /** Derived, read-only or volatile and transient: shown, but not stored or edited. */
  readOnly: boolean
  isId: boolean
  defaultValue: string | null
  /** The opposite reference's name, for links drawn as one line. */
  opposite: string | null
  /** The opposite of a containment: it always points at the object's container, so EMF does not store it. */
  container: boolean
  /** The class that declares the feature, which may be a supertype. */
  declaredIn: string
  parsed: ParsedAttribute | ParsedReference
}

export interface MetaClass {
  id: string
  name: string
  abstract: boolean
  nsURI: string
  nsPrefix: string
  /** Key of the .ecore file that defines it. */
  fileKey: string
  fileName: string
  /** Where its package sits in that file, as EMF names it in `xsi:schemaLocation`: `/` for a root package. */
  packagePath: string
  /** Every feature, inherited ones first, in the order EMF writes them. */
  features: MetaFeature[]
  /** The class and all its subtypes. */
  family: string[]
}

export interface Metamodel {
  graph: ModelGraph
  classes: ReadonlyMap<string, MetaClass>
  /** Classes by namespace URI and name, as an instance file names them. */
  byQName: ReadonlyMap<string, MetaClass>
  /** Concrete classes nothing contains: the likely roots of an instance. */
  roots: MetaClass[]
}

const INT_TYPES = new Set(['EInt', 'ELong', 'EShort', 'EByte', 'EBigInteger', 'EIntegerObject', 'ELongObject', 'EShortObject', 'EByteObject'])
const FLOAT_TYPES = new Set(['EDouble', 'EFloat', 'EBigDecimal', 'EDoubleObject', 'EFloatObject'])
const BOOLEAN_TYPES = new Set(['EBoolean', 'EBooleanObject'])

export const qname = (nsURI: string, name: string) => `${nsURI}#${name}`

function valueKindOf(typeName: string, isEnum: boolean): ValueKind {
  if (isEnum) return 'enum'
  if (INT_TYPES.has(typeName)) return 'int'
  if (FLOAT_TYPES.has(typeName)) return 'float'
  if (BOOLEAN_TYPES.has(typeName)) return 'boolean'
  if (typeName === 'EDate') return 'date'
  return 'string'
}

export function buildMetamodel(models: ParsedModel[], links?: ManualLinks): Metamodel {
  const graph = buildGraph(models, links)
  const packages = new Map<string, ParsedPackage>()
  for (const m of models) for (const p of m.packages) packages.set(p.id, p)

  const own = (node: ClassGraphNode): MetaFeature[] => [
    ...node.attributes.map(({ feature, typeName, typeNodeId }): MetaFeature => {
      const typeNode = typeNodeId ? graph.nodes.get(typeNodeId) : undefined
      const isEnum = typeNode?.kind === 'enum'
      return {
        name: feature.name,
        kind: 'attribute',
        lower: feature.multiplicity.lower,
        upper: feature.multiplicity.upper,
        many: feature.multiplicity.upper < 0 || feature.multiplicity.upper > 1,
        containment: false,
        typeId: typeNodeId,
        typeName,
        valueKind: valueKindOf(typeName, isEnum),
        literals: isEnum ? typeNode.literals.map((l) => l.name) : [],
        readOnly: feature.derived || feature.readOnly || (feature.volatile && feature.transient),
        isId: feature.isId,
        defaultValue: feature.defaultValue,
        opposite: null,
        container: false,
        declaredIn: node.id,
        parsed: feature,
      }
    }),
    ...node.references.map(({ feature, typeName, targetId, opposite }): MetaFeature => ({
      name: feature.name,
      kind: 'reference',
      lower: feature.multiplicity.lower,
      upper: feature.multiplicity.upper,
      many: feature.multiplicity.upper < 0 || feature.multiplicity.upper > 1,
      containment: feature.containment,
      typeId: targetId,
      typeName,
      valueKind: 'string',
      literals: [],
      readOnly: feature.derived || feature.readOnly || (feature.volatile && feature.transient) || !!opposite?.containment,
      isId: false,
      defaultValue: null,
      opposite: opposite?.name ?? null,
      container: !!opposite?.containment,
      declaredIn: node.id,
      parsed: feature,
    })),
  ]

  // EMF's eAllStructuralFeatures: each supertype's features (depth first, once each), then the class's own.
  const allFeatures = (node: ClassGraphNode, seen = new Set<string>()): MetaFeature[] => {
    if (seen.has(node.id)) return []
    seen.add(node.id)
    const inherited = node.superIds.flatMap((id) => {
      const parent = graph.nodes.get(id)
      return parent?.kind === 'class' ? allFeatures(parent, seen) : []
    })
    return [...inherited, ...own(node)]
  }

  const familyOf = (id: string, seen = new Set<string>()): string[] => {
    if (seen.has(id)) return []
    seen.add(id)
    const node = graph.nodes.get(id)
    return [id, ...(node?.subIds ?? []).flatMap((sub) => familyOf(sub, seen))]
  }

  const classes = new Map<string, MetaClass>()
  const byQName = new Map<string, MetaClass>()
  for (const node of graph.nodes.values()) {
    if (node.kind !== 'class') continue
    const pkg = packages.get(node.package.id)
    const meta: MetaClass = {
      id: node.id,
      name: node.name,
      abstract: node.abstract || node.interface,
      nsURI: node.package.nsURI,
      nsPrefix: pkg?.nsPrefix || pkg?.name || 'model',
      fileKey: node.package.fileKey,
      fileName: node.package.fileName,
      packagePath: pkg?.path ?? '/',
      features: allFeatures(node),
      family: familyOf(node.id),
    }
    classes.set(node.id, meta)
    byQName.set(qname(meta.nsURI, meta.name), meta)
  }

  const contained = new Set<string>()
  for (const meta of classes.values()) {
    for (const f of meta.features) if (f.containment && f.typeId) for (const id of classes.get(f.typeId)?.family ?? []) contained.add(id)
  }
  const roots = [...classes.values()].filter((c) => !c.abstract && !contained.has(c.id))

  return { graph, classes, byQName, roots }
}

/** The concrete classes a feature typed `typeId` can hold: the type and its subtypes that are not abstract. */
export function concreteFamily(meta: Metamodel, typeId: string | null): MetaClass[] {
  if (isAnyObject(meta, typeId)) return [...meta.classes.values()].filter((c) => !c.abstract)
  const type = typeId ? meta.classes.get(typeId) : undefined
  if (!type) return []
  return type.family.flatMap((id) => {
    const c = meta.classes.get(id)
    return c && !c.abstract ? [c] : []
  })
}

/** True when an object of class `classId` can be a value of a feature typed `typeId`. */
export function conforms(meta: Metamodel, classId: string, typeId: string | null): boolean {
  if (!typeId) return false
  if (isAnyObject(meta, typeId)) return true
  return meta.classes.get(typeId)?.family.includes(classId) ?? false
}

/** A reference typed Ecore's own EObject accepts any object. */
function isAnyObject(meta: Metamodel, typeId: string | null): boolean {
  const node = typeId ? meta.graph.nodes.get(typeId) : undefined
  return node?.kind === 'external' && node.name === 'EObject'
}
