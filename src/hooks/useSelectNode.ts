import { useCallback } from 'react'
import { useDiagram } from '@/hooks/useDiagram'
import { useScope } from '@/hooks/useScope'
import { useSelection } from '@/hooks/useSelection'
import { useViewOptions } from '@/hooks/useViewOptions'

export interface SelectNodeOptions {
  center?: boolean
  /** Expands the collapsed package holding the node, rather than selecting the package's box. */
  expand?: boolean
}

/**
 * Selects a node, first switching on the view option that hides it if needed. A type inside a collapsed
 * package selects the package's box, unless `expand` asks for the package to be opened.
 */
export function useSelectNode() {
  const { graph, visible, drawn } = useDiagram()
  const { reveal } = useViewOptions()
  const { select } = useSelection()
  const { reveal: revealPackage, folded, toggleFolded } = useScope()

  return useCallback(
    (id: string, options?: SelectNodeOptions) => {
      const node = graph?.nodes.get(id)
      if (!node) {
        if (drawn?.nodeIds.has(id)) select(id, options)
        return
      }
      if (visible && !visible.nodeIds.has(id)) {
        reveal(node.kind)
        if (node.kind !== 'external') revealPackage(node.package.scopeId)
      }
      const scopeId = node.kind === 'external' ? null : node.package.scopeId
      if (scopeId && folded.has(scopeId)) {
        if (options?.expand) toggleFolded([scopeId])
        else {
          const block = drawn?.blockOf.get(id)
          if (block) {
            select(block, options)
            return
          }
        }
      }
      select(id, options)
    },
    [graph, visible, drawn, reveal, revealPackage, folded, toggleFolded, select],
  )
}
