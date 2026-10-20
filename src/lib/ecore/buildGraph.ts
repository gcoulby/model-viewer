import type {
  ParsedClass,
  ParsedClassifier,
  ParsedModel,
  ParsedReference,
} from '@/types/ecore'
import type {
  ClassGraphNode,
  ExternalGraphNode,
  GraphEdge,
  GraphNode,
  ModelGraph,
  PackageInfo,
  ResolvedAttribute,
  ResolvedOperation,
  ResolvedReference,
} from '@/types/graph'
import { scopeIdOf } from './scope'
import { buildPathIndexes, resolveRef, type ManualLinks, targetName, type RefTarget } from './resolve'

export const ECORE_BUILTIN_SOURCE = 'Ecore (built in)'

function isClassifier(object: { kind: string }): object is ParsedClassifier {
  return object.kind === 'class' || object.kind === 'enum' || object.kind === 'datatype'
}

export function buildGraph(models: ParsedModel[], links?: ManualLinks): ModelGraph {
  const indexes = buildPathIndexes(models)
  const nodes = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []
  const ghosts = new Map<string, ExternalGraphNode>()

  const packageInfo = new Map<string, PackageInfo>()
  for (const m of models) {
    for (const p of m.packages) {
      packageInfo.set(p.id, {
        id: p.id,
        fullName: p.fullName,
        nsURI: p.nsURI,
        fileName: m.fileName,
        fileKey: m.key,
        scopeId: scopeIdOf(m, p),
        modelIndex: m.index,
      })
    }
  }

  const ghostFor = (target: Exclude<RefTarget, { status: 'object' }>): ExternalGraphNode => {
    const builtin = target.status === 'builtin'
    const key = `${builtin ? 'ecore' : target.uri}|${target.name}`
    let ghost = ghosts.get(key)
    if (!ghost) {
      ghost = {
        kind: 'external',
        id: `ext|${key}`,
        name: target.name,
        source: builtin ? ECORE_BUILTIN_SOURCE : target.uri,
        superIds: [],
        subIds: [],
      }
      ghosts.set(key, ghost)
      nodes.set(ghost.id, ghost)
    }
    return ghost
  }

  /** The node a reference target draws as, or null when it points at something that is not a classifier. */
  const nodeFor = (target: RefTarget | null): GraphNode | null => {
    if (!target) return null
    if (target.status !== 'object') return ghostFor(target)
    return isClassifier(target.object) ? (nodes.get(target.object.id) ?? null) : null
  }

  for (const m of models) {
    for (const c of m.classifiers) {
      const info = packageInfo.get(c.packageId)
      if (!info) continue
      const base = { id: c.id, name: c.name, superIds: [], subIds: [] }
      if (c.kind === 'class') {
        nodes.set(c.id, {
          ...base,
          kind: 'class',
          package: info,
          abstract: c.abstract,
          interface: c.interface,
          attributes: [],
          references: [],
          operations: [],
        })
      } else if (c.kind === 'enum') {
        nodes.set(c.id, { ...base, kind: 'enum', package: info, literals: c.literals })
      } else {
        nodes.set(c.id, {
          ...base,
          kind: 'datatype',
          package: info,
          instanceClassName: c.instanceClassName,
        })
      }
    }
  }

  const resolvedReferences = new Map<ParsedReference, ResolvedReference>()
  const owners = new Map<ParsedReference, string>()

  for (const m of models) {
    for (const c of m.classifiers) {
      if (c.kind !== 'class') continue
      const node = nodes.get(c.id) as ClassGraphNode
      resolveClass(m, c, node)
    }
  }

  function resolveClass(m: ParsedModel, c: ParsedClass, node: ClassGraphNode) {
    const resolve = (token: string) => resolveRef(m, token, models, indexes, links)

    for (const token of c.superRaw) {
      const superNode = nodeFor(resolve(token))
      if (!superNode || superNode.id === node.id) continue
      node.superIds.push(superNode.id)
      superNode.subIds.push(node.id)
      edges.push({ id: `inherit|${node.id}|${superNode.id}`, kind: 'inherit', from: node.id, to: superNode.id })
    }

    for (const feature of c.attributes) {
      const target = resolve(feature.typeRaw)
      const typeNode = target?.status === 'object' && isClassifier(target.object) ? target.object : null
      const resolved: ResolvedAttribute = {
        feature,
        typeName: targetName(target),
        typeNodeId: typeNode ? typeNode.id : null,
      }
      node.attributes.push(resolved)
      if (typeNode?.kind === 'enum') {
        edges.push({
          id: `enumLink|${node.id}|${feature.path}`,
          kind: 'enumLink',
          from: node.id,
          to: typeNode.id,
          forward: resolved,
          back: null,
        })
      }
    }

    for (const feature of c.references) {
      const target = resolve(feature.typeRaw)
      const targetNode = nodeFor(target)
      const opposite = feature.oppositeRaw ? resolve(feature.oppositeRaw) : null
      const resolved: ResolvedReference = {
        feature,
        typeName: targetName(target),
        targetId: targetNode ? targetNode.id : null,
        opposite: opposite?.status === 'object' && opposite.object.kind === 'reference' ? opposite.object : null,
      }
      resolvedReferences.set(feature, resolved)
      owners.set(feature, node.id)
      node.references.push(resolved)
    }

    for (const op of c.operations) {
      const operation: ResolvedOperation = {
        operation: op,
        typeName: op.typeRaw ? targetName(resolve(op.typeRaw)) : '',
        parameterTypeNames: op.parameters.map((p) => targetName(resolve(p.typeRaw))),
      }
      node.operations.push(operation)
    }
  }

  const merged = new Set<ParsedReference>()
  for (const m of models) {
    for (const c of m.classifiers) {
      if (c.kind !== 'class') continue
      for (const feature of c.references) {
        if (merged.has(feature)) continue
        merged.add(feature)
        let forward = resolvedReferences.get(feature)
        if (!forward) continue
        const oppositeFeature = forward.opposite && forward.opposite !== feature ? forward.opposite : null
        let back = oppositeFeature ? (resolvedReferences.get(oppositeFeature) ?? null) : null
        if (back) {
          merged.add(back.feature)
          if (back.feature.containment && !forward.feature.containment) {
            const swap = forward
            forward = back
            back = swap
          }
        }
        if (!forward.targetId) continue
        const ownerId = owners.get(forward.feature)
        if (!ownerId) continue
        edges.push({
          id: `${forward.feature.containment ? 'containment' : 'reference'}|${forward.feature.path}`,
          kind: forward.feature.containment ? 'containment' : 'reference',
          from: ownerId,
          to: forward.targetId,
          forward,
          back,
        })
      }
    }
  }

  return { nodes, edges }
}
