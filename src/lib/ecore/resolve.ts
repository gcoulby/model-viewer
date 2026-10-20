import { ECORE_NAMESPACE } from '@/data/ecoreNamespace'
import { hasScheme, pathSegments, resolveRelative, uriPath } from './paths'
import type {
  ParsedAttribute,
  ParsedClassifier,
  ParsedModel,
  ParsedReference,
} from '@/types/ecore'

export type PathObject = ParsedClassifier | ParsedAttribute | ParsedReference

/** User-made links from an unresolved external's URI (as the external node shows it) to a loaded file's key. */
export type ManualLinks = ReadonlyMap<string, string>

const NO_LINKS: ManualLinks = new Map()

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

function pathSuffixMatch(models: ParsedModel[], path: string): ParsedModel | undefined {
  const segments = pathSegments(path.toLowerCase())
  for (let k = segments.length; k >= 1; k--) {
    const tail = segments.slice(-k).join('/')
    const hits = models.filter((m) => m.key === tail || m.key.endsWith(`/${tail}`))
    if (hits.length === 1) return hits[0]
  }
  return undefined
}

/**
 * The loaded file a reference URI points at, or null. A relative URI is read against the referencing
 * file's folder; anything else (`file:`, `platform:`, a path leaving the opened folder) falls back to the
 * longest unique path suffix, then to a matching `nsURI`.
 */
export function findTargetModel(
  from: ParsedModel,
  uri: string,
  models: ParsedModel[],
  links: ManualLinks = NO_LINKS,
): ParsedModel | null {
  const linked = links.get(displayUri(from, uri))
  if (linked) {
    const model = models.find((m) => m.key === linked)
    if (model) return model
  }
  if (!hasScheme(uri)) {
    const resolved = resolveRelative(from.dir, uri).toLowerCase()
    const exact = models.find((m) => m.key === resolved)
    if (exact) return exact
  }
  const byNs = models.find((m) => m.roots.some((r) => r.nsURI === uri))
  if (byNs) return byNs
  const path = uriPath(uri)
  return path ? (pathSuffixMatch(models, path) ?? null) : null
}

/** The URI as a path from the opened folder when it is relative, otherwise unchanged. */
function displayUri(from: ParsedModel, uri: string): string {
  return hasScheme(uri) ? uri : resolveRelative(from.dir, uri)
}

/** Resolves a `<uri>#<fragment>` token seen from `model`. Returns null for an empty token. */
export function resolveRef(
  model: ParsedModel,
  token: string,
  models: ParsedModel[],
  indexes: ModelIndexes,
  links: ManualLinks = NO_LINKS,
): RefTarget | null {
  if (!token) return null
  const hash = token.indexOf('#')
  const uri = hash >= 0 ? token.slice(0, hash) : ''
  const fragment = hash >= 0 ? token.slice(hash + 1) : token
  const name = fragment.split('/').filter(Boolean).pop() ?? fragment

  if (uri.includes(ECORE_NAMESPACE)) return { status: 'builtin', name }

  const target = uri ? findTargetModel(model, uri, models, links) : model
  if (target) {
    const object = indexes.get(target.index)?.get(fragment)
    if (object) return { status: 'object', object }
  }
  return { status: 'external', name, uri: uri ? displayUri(model, uri) : model.fileName }
}

export function targetName(target: RefTarget | null): string {
  if (!target) return '?'
  return target.status === 'object' ? target.object.name : target.name
}
