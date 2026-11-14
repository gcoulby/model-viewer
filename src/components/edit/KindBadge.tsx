import { ClassifierIcon } from '@/components/sidebar/ClassifierIcon'
import { KIND_LETTER, type EKind } from '@/lib/ecore/edit/kinds'
import { cn } from '@/lib/utils'
import type { GraphNode } from '@/types/graph'

/**
 * The letter badge beside an element. A classifier on the diagram wears the same badge as in view mode, in
 * its file's colour; everything else gets a quiet outlined letter.
 */
export function KindBadge({ kind, node }: { kind: EKind; node?: GraphNode }) {
  if (node) return <ClassifierIcon node={node} />
  const feature = kind === 'EAttribute' || kind === 'EReference' || kind === 'EOperation'
  return (
    <i
      aria-hidden="true"
      className={cn(
        'inline-grid size-[17px] flex-none place-items-center rounded-[4px] font-mono text-[10.5px] font-medium not-italic',
        kind === 'EPackage'
          ? 'bg-muted text-foreground shadow-[inset_0_0_0_1px_var(--border)]'
          : feature
            ? 'text-primary shadow-[inset_0_0_0_1px_var(--border)]'
            : 'text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]',
      )}
    >
      {KIND_LETTER[kind]}
    </i>
  )
}
