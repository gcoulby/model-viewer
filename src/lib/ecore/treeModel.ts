import type { ParsedClassifier, ParsedModel, ParsedPackage } from '@/types/ecore'
import type { PackageInfo } from '@/types/graph'

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

export function packageInfoOf(pkg: ParsedPackage, model: ParsedModel): PackageInfo {
  return {
    id: pkg.id,
    fullName: pkg.fullName,
    nsURI: pkg.nsURI,
    fileName: model.fileName,
    fileKey: model.key,
    modelIndex: model.index,
  }
}

function filterPackage(pkg: ParsedPackage, query: string): TreePackage | null {
  const packageMatches = !query || pkg.name.toLowerCase().includes(query)
  const classifiers = pkg.classifiers.filter(
    (c) => !query || packageMatches || c.name.toLowerCase().includes(query),
  )
  const subpackages = pkg.subpackages
    .map((sub) => filterPackage(sub, query))
    .filter((sub): sub is TreePackage => sub !== null)
  const count = classifiers.length + subpackages.reduce((sum, sub) => sum + sub.count, 0)
  return count ? { pkg, classifiers, subpackages, count } : null
}

/** The tree for the models, keeping only what matches the lower-cased query. */
export function filterTree(models: ParsedModel[], query: string): TreeFile[] {
  const files: TreeFile[] = []
  for (const model of models) {
    const packages = model.roots
      .map((root) => filterPackage(root, query))
      .filter((p): p is TreePackage => p !== null)
    const count = packages.reduce((sum, p) => sum + p.count, 0)
    if (count) files.push({ model, packages, count })
  }
  return files
}
