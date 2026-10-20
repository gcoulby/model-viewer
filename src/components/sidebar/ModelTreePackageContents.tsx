import type { TreePackage } from '@/lib/ecore/treeModel'
import type { ParsedModel } from '@/types/ecore'
import { ModelTreeItem } from './ModelTreeItem'
import { ModelTreePackage } from './ModelTreePackage'

/** The classifiers and sub-packages of a package, without a row for the package itself. */
export function ModelTreePackageContents({ tree, model }: { tree: TreePackage; model: ParsedModel }) {
  return (
    <>
      {tree.classifiers.map((classifier) => (
        <ModelTreeItem key={classifier.id} classifier={classifier} />
      ))}
      {tree.subpackages.map((sub) => (
        <ModelTreePackage key={sub.pkg.id} tree={sub} model={model} />
      ))}
    </>
  )
}
