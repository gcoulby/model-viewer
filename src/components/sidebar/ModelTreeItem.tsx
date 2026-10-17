import { useSidebar } from '@/components/ui/sidebar'
import { useDiagram } from '@/hooks/useDiagram'
import { useSelectNode } from '@/hooks/useSelectNode'
import { useSelection } from '@/hooks/useSelection'
import { cn } from '@/lib/utils'
import type { ParsedClassifier } from '@/types/ecore'
import { ClassifierIcon } from './ClassifierIcon'

export function ModelTreeItem({ classifier }: { classifier: ParsedClassifier }) {
  const { graph } = useDiagram()
  const { selectedId } = useSelection()
  const selectNode = useSelectNode()
  const { isMobile, setOpenMobile } = useSidebar()
  const node = graph?.nodes.get(classifier.id)
  if (!node) return null

  return (
    <button
      type="button"
      onClick={() => {
        selectNode(classifier.id, { center: true })
        if (isMobile) setOpenMobile(false)
      }}
      className={cn(
        'flex w-full items-center gap-2 rounded-md py-[3px] pr-1.5 pl-6 text-left hover:bg-muted',
        selectedId === classifier.id && 'bg-tint shadow-[inset_2px_0_0_var(--primary)]',
      )}
    >
      <ClassifierIcon node={node} />
      <span className="truncate">{classifier.name}</span>
    </button>
  )
}
