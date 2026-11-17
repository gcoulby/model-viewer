import { readDetails } from '@/lib/constraints'
import { constraintTargetOf } from '@/lib/ecore/edit/constraintTarget'
import { elementAt } from '@/lib/ecore/edit/dom'
import type { RefFile } from '@/lib/ecore/edit/refs'
import { ConstraintFields } from './ConstraintFields'

/** Edit mode's Constraints section, for the targeted attribute or reference. */
export function ConstraintsSection({ el, path, file, files, docs }: { el: Element; path: number[]; file: RefFile; files: RefFile[]; docs: ReadonlyMap<string, Document> }) {
  const { target, literals } = constraintTargetOf(el, file, files, docs)
  return (
    <section className="mt-5">
      <h3 className="mb-1 text-[13px] font-semibold">Constraints</h3>
      <p className="mb-2.5 text-xs text-muted-foreground">Checked on instances and followed when one is generated. Saved in the .ecore as an annotation.</p>
      <ConstraintFields
        fileKey={file.key}
        locate={(doc) => elementAt(doc, path)}
        featureId={path.join('/')}
        target={target}
        details={readDetails(el)}
        literals={literals}
      />
    </section>
  )
}
