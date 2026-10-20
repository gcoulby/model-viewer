import { useCallback } from 'react'
import { useDiagram } from '@/hooks/useDiagram'
import { useScope } from '@/hooks/useScope'
import { useSelection } from '@/hooks/useSelection'
import { useViewOptions } from '@/hooks/useViewOptions'

/** Selects a node, first switching on the view option that hides it if needed. */
export function useSelectNode() {
  const { graph, visible } = useDiagram()
  const { reveal } = useViewOptions()
  const { select } = useSelection()
  const { reveal: revealPackage } = useScope()

  return useCallback(
    (id: string, options?: { center?: boolean }) => {
      const node = graph?.nodes.get(id)
      if (!node) return
      if (visible && !visible.nodeIds.has(id)) {
        reveal(node.kind)
        if (node.kind !== 'external') revealPackage(node.package.scopeId)
      }
      select(id, options)
    },
    [graph, visible, reveal, revealPackage, select],
  )
}
