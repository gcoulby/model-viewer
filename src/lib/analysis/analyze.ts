import type { Problem } from '@/lib/ecore/edit/validate'
import { concreteFamily, type Metamodel } from '@/lib/instance/metamodel'
import type { ParsedModel } from '@/types/ecore'
import type { ClassGraphNode, GraphNode } from '@/types/graph'

export type FindingSeverity = 'error' | 'warning' | 'info'

/** Something in the model a report draws attention to, with the elements it is about. */
export interface Finding {
  id: string
  severity: FindingSeverity
  title: string
  detail: string
  items: { nodeId: string | null; label: string; note?: string }[]
}

export interface ClassRow {
  id: string
  name: string
  packageName: string
  fileName: string
  kind: 'class' | 'abstract' | 'interface'
  attributes: number
  references: number
  operations: number
  /** Features inherited from supertypes. */
  inherited: number
  /** Depth of inheritance: the longest path up to a class with no supertypes. */
  dit: number
  /** Number of direct subclasses. */
  noc: number
  /** Classes whose references point at this one. */
  fanIn: number
  /** Classes this one's references point at. */
  fanOut: number
  /** Classes with a containment that can hold this one. */
  containers: number
  constraints: number
}

export interface Report {
  generatedAt: string
  files: string[]
  summary: {
    packages: number
    classes: number
    abstractClasses: number
    interfaces: number
    enums: number
    dataTypes: number
    attributes: number
    references: number
    containments: number
    bidirectional: number
    operations: number
    constrainedFeatures: number
    errors: number
    warnings: number
  }
  containment: { roots: string[]; depth: number; recursive: string[] }
  /** Classes at each depth of inheritance, from 0. */
  ditDistribution: number[]
  /** Classes by number of features (own and inherited), in FEATURE_BUCKETS. */
  featureDistribution: number[]
  classes: ClassRow[]
  findings: Finding[]
}

export const FEATURE_BUCKETS = [
  { label: '0', max: 0 },
  { label: '1–3', max: 3 },
  { label: '4–6', max: 6 },
  { label: '7–10', max: 10 },
  { label: '11–20', max: 20 },
  { label: '21+', max: Infinity },
]

const UPPER_CAMEL = /^[A-Z][A-Za-z0-9_]*$/
const LOWER_CAMEL = /^[a-z][A-Za-z0-9_]*$/
const LARGE_CLASS = 20
const DEEP_INHERITANCE = 4

/**
 * Measures a metamodel and lists what deserves a look: classes that can't be instantiated, unreachable
 * classes, unused types, naming, size and inheritance outliers, and the validator's problems.
 */
export function analyze(meta: Metamodel, models: ParsedModel[], problems: Problem[]): Report {
  const nodes = [...meta.graph.nodes.values()]
  const classes = nodes.filter((n): n is ClassGraphNode => n.kind === 'class')
  const byId = new Map<string, GraphNode>(nodes.map((n) => [n.id, n]))
  const isClass = (id: string) => byId.get(id)?.kind === 'class'
  const name = (id: string) => byId.get(id)?.name ?? id

  // Inheritance depth, with a guard against cycles (which the validator reports).
  const ditCache = new Map<string, number>()
  const dit = (id: string, seen = new Set<string>()): number => {
    if (ditCache.has(id)) return ditCache.get(id)!
    if (seen.has(id)) return 0
    seen.add(id)
    const node = byId.get(id)
    const ups = (node?.superIds ?? []).filter(isClass)
    const depth = ups.length ? 1 + Math.max(...ups.map((u) => dit(u, seen))) : 0
    ditCache.set(id, depth)
    return depth
  }

  // Coupling through references (own features only, so inherited ones count once, on their class).
  const fanOut = new Map<string, Set<string>>()
  const fanIn = new Map<string, Set<string>>()
  for (const c of classes) {
    for (const r of c.references) {
      if (!r.targetId || !isClass(r.targetId) || r.targetId === c.id) continue
      if (!fanOut.has(c.id)) fanOut.set(c.id, new Set())
      fanOut.get(c.id)!.add(r.targetId)
      if (!fanIn.has(r.targetId)) fanIn.set(r.targetId, new Set())
      fanIn.get(r.targetId)!.add(c.id)
    }
  }

  // Which classes can sit in which: every containment, with the concrete classes it accepts.
  const containers = new Map<string, Set<string>>()
  const holds = new Map<string, Set<string>>()
  for (const cls of meta.classes.values()) {
    for (const f of cls.features) {
      if (!f.containment || f.readOnly) continue
      for (const child of concreteFamily(meta, f.typeId)) {
        if (!containers.has(child.id)) containers.set(child.id, new Set())
        containers.get(child.id)!.add(cls.id)
        if (!holds.has(cls.id)) holds.set(cls.id, new Set())
        holds.get(cls.id)!.add(child.id)
      }
    }
  }

  // Containment reach from the roots, and the deepest chain without repeating a class.
  const roots = meta.roots.map((r) => r.id)
  const reachable = new Set(roots)
  const queue = [...roots]
  while (queue.length) {
    for (const child of holds.get(queue.shift()!) ?? []) {
      if (reachable.has(child)) continue
      reachable.add(child)
      queue.push(child)
    }
  }
  let depth = 0
  const recursive = new Set<string>()
  const walk = (id: string, path: string[]) => {
    depth = Math.max(depth, path.length)
    if (path.length > 24) return
    for (const child of holds.get(id) ?? []) {
      if (path.includes(child)) for (const id of path.slice(path.indexOf(child))) recursive.add(id)
      else walk(child, [...path, child])
    }
  }
  for (const r of roots) walk(r, [r])

  // A class can be instantiated finitely when each required containment accepts a class that can.
  const finite = new Set<string>()
  for (let changed = true; changed; ) {
    changed = false
    for (const cls of meta.classes.values()) {
      if (cls.abstract || finite.has(cls.id)) continue
      const ok = cls.features.every((f) => !f.containment || f.readOnly || f.lower === 0 || concreteFamily(meta, f.typeId).some((c) => finite.has(c.id)))
      if (!ok) continue
      finite.add(cls.id)
      changed = true
    }
  }

  const rows: ClassRow[] = classes.map((c) => {
    const metaClass = meta.classes.get(c.id)
    const own = c.attributes.length + c.references.length
    return {
      id: c.id,
      name: c.name,
      packageName: c.package.fullName,
      fileName: c.package.fileName,
      kind: c.interface ? 'interface' : c.abstract ? 'abstract' : 'class',
      attributes: c.attributes.length,
      references: c.references.length,
      operations: c.operations.length,
      inherited: Math.max(0, (metaClass?.features.length ?? own) - own),
      dit: dit(c.id),
      noc: c.subIds.filter(isClass).length,
      fanIn: fanIn.get(c.id)?.size ?? 0,
      fanOut: fanOut.get(c.id)?.size ?? 0,
      containers: containers.get(c.id)?.size ?? 0,
      constraints: [...c.attributes, ...c.references].filter((f) => Object.values(f.feature.constraints).some((v) => v?.trim())).length,
    }
  })

  const findings: Finding[] = []
  const add = (f: Omit<Finding, 'items'> & { items: Finding['items'] }) => f.items.length && findings.push(f)
  const errors = problems.filter((p) => p.severity === 'error')
  const warnings = problems.filter((p) => p.severity === 'warning')

  add({
    id: 'infinite',
    severity: 'error',
    title: "Classes that can't be instantiated",
    detail: 'Every instance would need an endless chain of required contained objects: each required containment only accepts classes that need another.',
    items: [...meta.classes.values()].filter((c) => !c.abstract && !finite.has(c.id)).map((c) => ({ nodeId: c.id, label: c.name })),
  })
  add({
    id: 'problems',
    severity: errors.length ? 'error' : 'warning',
    title: 'Validation problems',
    detail: `${errors.length} error${errors.length === 1 ? '' : 's'} and ${warnings.length} warning${warnings.length === 1 ? '' : 's'} from the Ecore checks; Edit mode lists them in Problems.`,
    items: problems.slice(0, 50).map((p) => ({ nodeId: null, label: p.message, note: p.ref.key })),
  })
  add({
    id: 'unreachable',
    severity: 'warning',
    title: 'Classes no root can contain',
    detail: "Concrete classes that aren't roots and can't be reached by containment from one, so they can only appear as extra root objects in an instance.",
    items: [...meta.classes.values()].filter((c) => !c.abstract && containers.has(c.id) && !reachable.has(c.id)).map((c) => ({ nodeId: c.id, label: c.name })),
  })
  add({
    id: 'abstract-leaf',
    severity: 'warning',
    title: 'Abstract classes with no subclasses',
    detail: "Nothing can ever be an instance of these, as no concrete class inherits from them.",
    items: classes.filter((c) => (c.abstract || c.interface) && !c.subIds.some(isClass)).map((c) => ({ nodeId: c.id, label: c.name })),
  })
  const usedTypes = new Set(classes.flatMap((c) => c.attributes.map((a) => a.typeNodeId)).filter(Boolean))
  add({
    id: 'unused-types',
    severity: 'warning',
    title: 'Enums and data types nothing uses',
    detail: 'No attribute has these as its type.',
    items: nodes.filter((n) => (n.kind === 'enum' || n.kind === 'datatype') && !usedTypes.has(n.id)).map((n) => ({ nodeId: n.id, label: n.name, note: n.kind === 'enum' ? 'enum' : 'data type' })),
  })
  add({
    id: 'isolated',
    severity: 'info',
    title: 'Isolated classes',
    detail: 'No supertypes, subclasses or references in or out, and nothing contains them.',
    items: classes
      .filter((c) => !c.superIds.some(isClass) && !c.subIds.some(isClass) && !fanIn.has(c.id) && !fanOut.has(c.id) && !containers.has(c.id) && !holds.has(c.id))
      .map((c) => ({ nodeId: c.id, label: c.name })),
  })
  add({
    id: 'empty',
    severity: 'info',
    title: 'Classes with no features',
    detail: 'No attributes, references or operations, inherited or their own.',
    items: rows.filter((r) => r.attributes + r.references + r.operations + r.inherited === 0).map((r) => ({ nodeId: r.id, label: r.name })),
  })
  add({
    id: 'large',
    severity: 'info',
    title: `Large classes (more than ${LARGE_CLASS} features)`,
    detail: 'Counting inherited features. Large classes are often several concepts in one.',
    items: rows.filter((r) => r.attributes + r.references + r.inherited > LARGE_CLASS).map((r) => ({ nodeId: r.id, label: r.name, note: `${r.attributes + r.references + r.inherited} features` })),
  })
  add({
    id: 'deep',
    severity: 'info',
    title: `Deep inheritance (more than ${DEEP_INHERITANCE} levels)`,
    detail: 'Long supertype chains make a class harder to understand and change.',
    items: rows.filter((r) => r.dit > DEEP_INHERITANCE).map((r) => ({ nodeId: r.id, label: r.name, note: `depth ${r.dit}` })),
  })
  add({
    id: 'multiple',
    severity: 'info',
    title: 'Multiple inheritance',
    detail: 'Classes with more than one supertype that is a class. EMF supports it, but generated Java code extends only the first.',
    items: classes.filter((c) => c.superIds.filter((s) => byId.get(s)?.kind === 'class' && !(byId.get(s) as ClassGraphNode).interface).length > 1).map((c) => ({ nodeId: c.id, label: c.name, note: c.superIds.map(name).join(', ') })),
  })
  add({
    id: 'recursive',
    severity: 'info',
    title: 'Recursive containment',
    detail: 'Classes that can (directly or further down) contain their own kind, such as trees. Fine when intended; instances can nest without limit.',
    items: [...recursive].map((id) => ({ nodeId: id, label: name(id) })),
  })
  const naming = [
    ...nodes.filter((n) => (n.kind === 'class' || n.kind === 'enum' || n.kind === 'datatype') && !UPPER_CAMEL.test(n.name)).map((n) => ({ nodeId: n.id, label: n.name, note: 'type names start upper case' })),
    ...classes.flatMap((c) =>
      [...c.attributes, ...c.references].filter((f) => !LOWER_CAMEL.test(f.feature.name)).map((f) => ({ nodeId: c.id, label: `${c.name}.${f.feature.name}`, note: 'feature names start lower case' })),
    ),
  ]
  add({ id: 'naming', severity: 'info', title: 'Naming conventions', detail: 'EMF code generation expects UpperCamelCase types and lowerCamelCase features.', items: naming })
  const byName = new Map<string, ClassGraphNode[]>()
  for (const c of classes) byName.set(c.name, [...(byName.get(c.name) ?? []), c])
  add({
    id: 'same-name',
    severity: 'info',
    title: 'Classes sharing a name',
    detail: 'The same class name in more than one package, which can confuse readers and generated imports.',
    items: [...byName.values()].filter((list) => list.length > 1).flat().map((c) => ({ nodeId: c.id, label: c.name, note: c.package.fullName })),
  })

  const maxDit = Math.max(0, ...rows.map((r) => r.dit))
  const ditDistribution = Array.from({ length: maxDit + 1 }, (_, d) => rows.filter((r) => r.dit === d).length)
  const featureDistribution = FEATURE_BUCKETS.map((b, i) =>
    rows.filter((r) => {
      const n = r.attributes + r.references + r.inherited
      return n <= b.max && (i === 0 || n > FEATURE_BUCKETS[i - 1]!.max)
    }).length,
  )
  const allRefs = classes.flatMap((c) => c.references)

  return {
    generatedAt: new Date().toISOString(),
    files: models.map((m) => m.fileName),
    summary: {
      packages: models.reduce((n, m) => n + m.packages.length, 0),
      classes: classes.length,
      abstractClasses: classes.filter((c) => c.abstract && !c.interface).length,
      interfaces: classes.filter((c) => c.interface).length,
      enums: nodes.filter((n) => n.kind === 'enum').length,
      dataTypes: nodes.filter((n) => n.kind === 'datatype').length,
      attributes: classes.reduce((n, c) => n + c.attributes.length, 0),
      references: allRefs.length,
      containments: allRefs.filter((r) => r.feature.containment).length,
      bidirectional: allRefs.filter((r) => r.opposite).length,
      operations: classes.reduce((n, c) => n + c.operations.length, 0),
      constrainedFeatures: rows.reduce((n, r) => n + r.constraints, 0),
      errors: errors.length,
      warnings: warnings.length,
    },
    containment: { roots: meta.roots.map((r) => r.name), depth, recursive: [...recursive].map(name) },
    ditDistribution,
    featureDistribution,
    classes: rows,
    findings,
  }
}
