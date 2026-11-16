import type { ClassGraphNode, GraphEdge, ModelGraph, PackageInfo } from '@/types/graph'
import { conforms, type MetaFeature, type Metamodel } from './metamodel'
import { allObjects, attributeValues, classOf, labelOf, objectByFragment, objectId, referenceTokens } from './xmi'

export interface InstanceFile {
  key: string
  name: string
  index: number
  doc: Document
}

const SLOT_LIMIT = 4

function formatValue(feature: MetaFeature, value: string): string {
  return feature.valueKind === 'string' || feature.valueKind === 'date' ? `"${value}"` : value
}

function slotRow(feature: MetaFeature, values: string[]): string {
  if (!feature.many) return `${feature.name} = ${formatValue(feature, values[0] ?? '')}`
  const shown = values.slice(0, SLOT_LIMIT).map((v) => formatValue(feature, v))
  return `${feature.name} = [${shown.join(', ')}${values.length > SLOT_LIMIT ? `, … ${values.length - SLOT_LIMIT} more` : ''}]`
}

/**
 * The instances as a diagram: each object a box named `name : Class` listing its set values, containment
 * as composition links and references as plain links, a pair of opposite references as one line.
 */
export function buildObjectGraph(meta: Metamodel, files: InstanceFile[]): ModelGraph {
  const nodes = new Map<string, ClassGraphNode>()
  const edges: GraphEdge[] = []

  for (const file of files) {
    const info: PackageInfo = {
      id: `instance|${file.key}`,
      fullName: file.name,
      nsURI: '',
      fileName: file.name,
      fileKey: file.key,
      scopeId: `instance|${file.key}`,
      modelIndex: file.index,
    }
    const objects = allObjects(meta, file.doc)
    const idOf = new Map(objects.map((o) => [o, objectId(file.index, o)]))
    for (const el of objects) {
      const cls = classOf(meta, el)
      const { name, className } = labelOf(meta, el)
      const slots = (cls?.features ?? []).flatMap((f) => {
        if (f.kind !== 'attribute') return []
        const values = attributeValues(el, f)
        return values.length ? [slotRow(f, values)] : []
      })
      nodes.set(idOf.get(el)!, {
        kind: 'class',
        id: idOf.get(el)!,
        name: `${name} : ${className}`.trim(),
        superIds: [],
        subIds: [],
        package: info,
        abstract: false,
        interface: false,
        attributes: [],
        references: [],
        operations: [],
        object: { className, slots },
      })
    }

    // Links. One drawn for an opposite pair: the second direction becomes the first's `back`.
    const drawn = new Map<string, GraphEdge & { kind: 'containment' | 'reference' }>()
    for (const el of objects) {
      const cls = classOf(meta, el)
      const from = idOf.get(el)!
      for (const feature of cls?.features ?? []) {
        // A container reference is the containment link seen from below; that link is drawn already.
        if (feature.kind !== 'reference' || feature.container || feature.parsed.kind !== 'reference') continue
        const targets = feature.containment
          ? Array.from(el.children).filter((c) => c.localName === feature.name)
          : referenceTokens(el, feature).flatMap((t) => {
              const target = objectByFragment(meta, file.doc, t)
              return target ? [target] : []
            })
        targets.forEach((target, i) => {
          const to = idOf.get(target)
          const targetClass = classOf(meta, target)
          if (!to || !targetClass || !conforms(meta, targetClass.id, feature.typeId)) return
          // The label names the link's feature only: on an object diagram every link is one value.
          const resolved = {
            feature: { ...feature.parsed, multiplicity: { lower: 0, upper: 1 } } as typeof feature.parsed & { kind: 'reference' },
            typeName: targetClass.name,
            targetId: to,
            opposite: null,
          }
          const reverse = feature.opposite ? drawn.get(`${to}|${feature.opposite}|${from}`) : undefined
          if (reverse && !reverse.back) {
            reverse.back = resolved
            return
          }
          const edge = {
            id: `link|${from}|${feature.name}|${i}`,
            kind: feature.containment ? ('containment' as const) : ('reference' as const),
            from,
            to,
            forward: resolved,
            back: null,
          }
          drawn.set(`${from}|${feature.name}|${to}`, edge)
          edges.push(edge)
        })
      }
    }
  }
  return { nodes, edges }
}
