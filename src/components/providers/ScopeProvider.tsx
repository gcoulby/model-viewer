import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ScopeContext } from '@/contexts/scope-context'
import { NO_SCOPE, type Scope } from '@/lib/ecore/scope'

const sameIds = (a: ReadonlySet<string>, b: readonly string[]) => a.size === b.length && b.every((id) => a.has(id))

export function ScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<Scope>(NO_SCOPE)

  const focusOn = useCallback((ids: string[], label: string) => {
    setScope((prev) =>
      prev.focus && sameIds(prev.focus.ids, ids)
        ? { ...prev, focus: null }
        : { ...prev, focus: { ids: new Set(ids), label, includeLinked: prev.focus?.includeLinked ?? true } },
    )
  }, [])

  const clearFocus = useCallback(() => setScope((prev) => ({ ...prev, focus: null })), [])

  const setIncludeLinked = useCallback((includeLinked: boolean) => {
    setScope((prev) => (prev.focus ? { ...prev, focus: { ...prev.focus, includeLinked } } : prev))
  }, [])

  const toggleHidden = useCallback((ids: string[]) => {
    setScope((prev) => {
      const hidden = new Set(prev.hidden)
      const allHidden = ids.every((id) => hidden.has(id))
      for (const id of ids) {
        if (allHidden) hidden.delete(id)
        else hidden.add(id)
      }
      return { ...prev, hidden }
    })
  }, [])

  const showHidden = useCallback(() => setScope((prev) => ({ ...prev, hidden: new Set() })), [])

  const reveal = useCallback((scopeId: string) => {
    setScope((prev) => {
      const focusMisses = prev.focus && !prev.focus.ids.has(scopeId)
      if (!prev.hidden.has(scopeId) && !focusMisses) return prev
      const hidden = new Set(prev.hidden)
      hidden.delete(scopeId)
      return { focus: focusMisses ? null : prev.focus, hidden }
    })
  }, [])

  const value = useMemo(
    () => ({ ...scope, focusOn, clearFocus, setIncludeLinked, toggleHidden, showHidden, reveal }),
    [scope, focusOn, clearFocus, setIncludeLinked, toggleHidden, showHidden, reveal],
  )
  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
}
