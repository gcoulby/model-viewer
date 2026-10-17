import { ECORE_NAMESPACE } from '@/data/ecoreNamespace'
import type {
  ParsedAttribute,
  ParsedClassifier,
  ParsedModel,
  ParsedReference,
} from '@/types/ecore'

export type PathObject = ParsedClassifier | ParsedAttribute | ParsedReference

export type ModelIndexes = Map<number, Map<string, PathObject>>

export type RefTarget =
  | { status: 'object'; object: PathObject }
  | { status: 'builtin'; name: string }
  | { status: 'external'; name: string; uri: string }

export function buildPathIndexes(models: ParsedModel[]): ModelIndexes {
  const indexes: ModelIndexes = new Map()
  for (const model of models) {
    const byPath = new Map<string, PathObject>()
    for (const c of model.classifiers) {
      byPath.set(c.path, c)
      if (c.kind === 'class') {
        for (const f of [...c.attributes, ...c.references]) byPath.set(f.path, f)
      }
    }
    indexes.set(model.index, byPath)
  }
  return indexes
}

function baseFileName(uri: string): string {
  return uri.replace(/^.*[\\/]/, '').toLowerCase()
}

/** Resolves a `<uri>#<fragment>` token seen from `model`. Returns null for an empty token. */
export function resolveRef(
  model: ParsedModel,
  token: string,
  models: ParsedModel[],
  indexes: ModelIndexes,
): RefTarget | null {
  if (!token) return null
  const hash = token.indexOf('#')
  const uri = hash >= 0 ? token.slice(0, hash) : ''
  const fragment = hash >= 0 ? token.slice(hash + 1) : token
  const name = fragment.split('/').filter(Boolean).pop() ?? fragment

  if (uri.includes(ECORE_NAMESPACE)) return { status: 'builtin', name }

  let target: ParsedModel | undefined
  if (!uri) {
    target = model
  } else {
    const base = baseFileName(uri)
    target =
      models.find((m) => m.key === base) ?? models.find((m) => m.roots.some((r) => r.nsURI === uri))
  }
  if (target) {
    const object = indexes.get(target.index)?.get(fragment)
    if (object) return { status: 'object', object }
  }
  return { status: 'external', name, uri: uri || model.fileName }
}

export function targetName(target: RefTarget | null): string {
  if (!target) return '?'
  return target.status === 'object' ? target.object.name : target.name
}
