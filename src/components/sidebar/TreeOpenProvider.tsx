import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { TreeOpenContext } from '@/contexts/tree-open-context'

/** Open/closed state for every file and package row, with expand-all and collapse-all. */
export function TreeOpenProvider({ children }: { children: ReactNode }) {
  const [base, setBase] = useState(true)
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(new Map())

  const isOpen = useCallback((id: string) => overrides.get(id) ?? base, [overrides, base])
  const setOpen = useCallback((id: string, open: boolean) => setOverrides((prev) => new Map(prev).set(id, open)), [])
  const setAll = useCallback((open: boolean) => {
    setBase(open)
    setOverrides(new Map())
  }, [])

  const value = useMemo(
    () => ({ isOpen, setOpen, expandAll: () => setAll(true), collapseAll: () => setAll(false) }),
    [isOpen, setOpen, setAll],
  )
  return <TreeOpenContext.Provider value={value}>{children}</TreeOpenContext.Provider>
}
