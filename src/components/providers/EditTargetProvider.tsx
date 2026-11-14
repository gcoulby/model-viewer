import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from 'react'
import { EditTargetContext, type FocusRequest } from '@/contexts/edit-target-context'
import { useDiagram } from '@/hooks/useDiagram'
import { useEditorMode } from '@/hooks/useEditorMode'
import { useModels } from '@/hooks/useModels'
import { useSelectNode } from '@/hooks/useSelectNode'
import { useSelection } from '@/hooks/useSelection'
import { useWorkspaceDocs } from '@/hooks/useWorkspaceDocs'
import { nearestAt, pathOf, refId, type ElementRef } from '@/lib/ecore/edit/dom'
import { elementForPath, enclosingClassifier, graphIdOf } from '@/lib/ecore/edit/refs'

/**
 * Keeps the element being edited and the diagram's selection in step, both ways. Targeting something in the
 * tree selects the type it belongs to; clicking a box or link targets that type or feature, as in the tree.
 */
export function EditTargetProvider({ children }: { children: ReactNode }) {
  const { mode } = useEditorMode()
  const { files } = useModels()
  const docs = useWorkspaceDocs()
  const { graph, drawn } = useDiagram()
  const { selectedId, clear } = useSelection()
  const selectNode = useSelectNode()
  const [target, setTargetState] = useState<ElementRef | null>(null)
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)
  // The diagram selection this provider last set or followed, so its own changes are not followed back.
  const synced = useRef<string | null>(null)
  const followedSelection = useRef(false)
  const centerNext = useRef(false)
  const nonce = useRef(0)
  const taken = useRef(0)

  // An undo can take the target away, so it falls back to its nearest surviving ancestor.
  const resolved = useMemo(() => {
    if (!target) return null
    const doc = docs.get(target.key)
    if (!doc) return null
    const { el, path } = nearestAt(doc, target.path)
    return { el, ref: path.length === target.path.length ? target : { key: target.key, path } }
  }, [target, docs])

  const setTarget = useCallback((ref: ElementRef | null, options?: { center?: boolean; focusName?: boolean }) => {
    setTargetState(ref)
    centerNext.current = !!options?.center
    if (options?.focusName && ref) {
      nonce.current += 1
      setFocusRequest({ nonce: nonce.current, refId: refId(ref) })
    }
  }, [])

  const takeFocus = useCallback((request: FocusRequest) => {
    if (request.nonce <= taken.current) return false
    taken.current = request.nonce
    return true
  }, [])

  // Read, not followed: the effect after this one follows the selection.
  const currentSelection = useEffectEvent(() => selectedId)

  // Target → diagram.
  useEffect(() => {
    const selectedId = currentSelection()
    if (mode !== 'edit') return
    if (followedSelection.current) {
      followedSelection.current = false
      return
    }
    if (!resolved) return
    const index = files.find((f) => f.key === resolved.ref.key)?.index
    const classifier = enclosingClassifier(resolved.el)
    const id = classifier && index !== undefined ? graphIdOf(index, classifier) : null
    if (id === selectedId && !centerNext.current) return
    synced.current = id
    if (id) selectNode(id, { center: centerNext.current })
    else if (selectedId) clear()
    centerNext.current = false
  }, [resolved, mode, files, selectNode, clear])

  // Diagram → target. The selection has several sources (clicks, search, Escape), so it is followed here
  // rather than at each of them.
  useEffect(() => {
    if (mode !== 'edit' || selectedId === synced.current) return
    synced.current = selectedId
    if (!selectedId) {
      setTargetState(null)
      return
    }
    const found = elementForSelection(selectedId)
    if (!found) return
    followedSelection.current = true
    setTargetState(found)

    function elementForSelection(id: string): ElementRef | null {
      const at = (nodeId: string, path?: string): ElementRef | null => {
        const bar = nodeId.indexOf('|')
        const file = files.find((f) => String(f.index) === nodeId.slice(0, bar))
        const doc = file && docs.get(file.key)
        const el = doc && elementForPath(doc, path ?? nodeId.slice(bar + 1))
        return file && el ? { key: file.key, path: pathOf(el) } : null
      }
      if (graph?.nodes.get(id)?.kind !== undefined && graph.nodes.get(id)?.kind !== 'external') return at(id)
      const edge = drawn?.edges.find((e) => e.id === id)
      if (!edge || edge.kind === 'dependency') return null
      if (edge.kind === 'inherit') return at(edge.from)
      return at(edge.from, edge.forward.feature.path)
    }
  }, [selectedId, mode, files, docs, graph, drawn])

  const value = useMemo(
    () => ({ target: resolved?.ref ?? null, element: resolved?.el ?? null, setTarget, focusRequest, takeFocus }),
    [resolved, setTarget, focusRequest, takeFocus],
  )
  return <EditTargetContext.Provider value={value}>{children}</EditTargetContext.Provider>
}
