import type { ParsedClassifier, ParsedModel, ParsedPackage } from '@/types/ecore'

export interface TreePackage {
  pkg: ParsedPackage
  classifiers: ParsedClassifier[]
  subpackages: TreePackage[]
  /** Classifiers in this package and everything below it. */
  count: number
}

export interface TreeFile {
  model: ParsedModel
  packages: TreePackage[]
  count: number
}

function filterPackage(pkg: ParsedPackage, query: string, keepEmpty: boolean): TreePackage | null {
  const packageMatches = !query || pkg.name.toLowerCase().includes(query)
  const classifiers = pkg.classifiers.filter(
    (c) => !query || packageMatches || c.name.toLowerCase().includes(query),
  )
  const subpackages = pkg.subpackages
    .map((sub) => filterPackage(sub, query, keepEmpty))
    .filter((sub): sub is TreePackage => sub !== null)
  const count = classifiers.length + subpackages.reduce((sum, sub) => sum + sub.count, 0)
  return count || (keepEmpty && !query) ? { pkg, classifiers, subpackages, count } : null
}

/**
 * The tree for the models, keeping only what matches the lower-cased query. Empty packages and files are
 * left out unless `keepEmpty` is set (in edit mode, where they are somewhere to add types) and nothing is
 * being searched for.
 */
export function filterTree(models: ParsedModel[], query: string, keepEmpty = false): TreeFile[] {
  const files: TreeFile[] = []
  for (const model of models) {
    const packages = model.roots
      .map((root) => filterPackage(root, query, keepEmpty))
      .filter((p): p is TreePackage => p !== null)
    const count = packages.reduce((sum, p) => sum + p.count, 0)
    if (count || (keepEmpty && !query)) files.push({ model, packages, count })
  }
  return files
}
