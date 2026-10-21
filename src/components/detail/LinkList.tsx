import { edgeTitle } from '@/lib/ecore/edgeStyle'
import { useSelectNode } from '@/hooks/useSelectNode'
import type { GraphEdge } from '@/types/graph'

interface LinkListProps {
  links: GraphEdge[]
  nameOf: (id: string) => string
}

/** The links behind a dependency, one per row; picking one opens its package and shows its source. */
export function LinkList({ links, nameOf }: LinkListProps) {
  const selectNode = useSelectNode()
  return (
    <ul>
      {links.map((link) => (
        <li key={link.id} className="border-b last:border-b-0">
          <button
            type="button"
            className="w-full py-[3px] text-left font-mono text-xs leading-normal break-words hover:text-primary"
            onClick={() => selectNode(link.from, { center: true, expand: true })}
          >
            {edgeTitle(link, nameOf)}
          </button>
        </li>
      ))}
    </ul>
  )
}
