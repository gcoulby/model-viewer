import type { ParsedModel, ParsedPackage } from '@/types/ecore'

/** Which packages the diagram shows. Packages are named by `scopeId`, which survives reloading a file. */
export interface Scope {
  /** When set, only these packages (plus what they link to) are shown. */
  focus: { ids: ReadonlySet<string>; label: string; includeLinked: boolean } | null
  hidden: ReadonlySet<string>
}

export const NO_SCOPE: Scope = { focus: null, hidden: new Set() }

export function scopeIdOf(model: ParsedModel, pkg: ParsedPackage): string {
  return `${model.key}|${pkg.path}`
}

/** The package and everything nested in it. */
export function packageScopeIds(model: ParsedModel, pkg: ParsedPackage): string[] {
  return [scopeIdOf(model, pkg), ...pkg.subpackages.flatMap((sub) => packageScopeIds(model, sub))]
}

export function fileScopeIds(model: ParsedModel): string[] {
  return model.roots.flatMap((root) => packageScopeIds(model, root))
}
