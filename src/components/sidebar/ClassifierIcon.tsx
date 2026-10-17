import { useTheme } from '@/hooks/useTheme'
import { classifierLetter } from '@/lib/ecore/format'
import { paintForNode } from '@/lib/ecore/paint'
import type { GraphNode } from '@/types/graph'

export function ClassifierIcon({ node }: { node: GraphNode }) {
  const { theme } = useTheme()
  const paint = paintForNode(node, theme === 'dark')
  return (
    <i
      className="inline-grid size-[17px] flex-none place-items-center rounded-[4px] font-mono text-[10.5px] font-medium text-foreground not-italic"
      style={{ background: paint.header, boxShadow: `inset 0 0 0 1px ${paint.stroke}` }}
    >
      {classifierLetter(node)}
    </i>
  )
}
