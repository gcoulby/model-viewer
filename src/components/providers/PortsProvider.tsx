import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { PortsContext } from '@/contexts/ports-context'

interface PortsState {
  overrides: ReadonlyMap<string, boolean>
  version: number
}

export function PortsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PortsState>({ overrides: new Map(), version: 0 })

  const setPorted = useCallback((edgeId: string, ported: boolean) => {
    setState((prev) => {
      if (prev.overrides.get(edgeId) === ported) return prev
      const overrides = new Map(prev.overrides)
      overrides.set(edgeId, ported)
      return { overrides, version: prev.version + 1 }
    })
  }, [])

  const reset = useCallback(
    () => setState((prev) => (prev.overrides.size ? { overrides: new Map(), version: prev.version + 1 } : prev)),
    [],
  )

  const value = useMemo(() => ({ ...state, setPorted, reset }), [state, setPorted, reset])
  return <PortsContext.Provider value={value}>{children}</PortsContext.Provider>
}
