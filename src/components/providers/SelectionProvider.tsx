import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { SelectionContext, type CenterRequest } from '@/contexts/selection-context'
import { useModels } from '@/hooks/useModels'
interface Selection {
  /** The workspace epoch the selection was made in. Loading or closing files clears it; edits do not. */
  scope: number
  id: string | null
}

export function SelectionProvider({ children }: { children: ReactNode }) {
  const { epoch } = useModels()
  const [selection, setSelection] = useState<Selection>({ scope: epoch, id: null })
  const [centerRequest, setCenterRequest] = useState<CenterRequest | null>(null)
  const nonce = useRef(0)

  const selectedId = selection.scope === epoch ? selection.id : null

  const select = useCallback(
    (id: string, options?: { center?: boolean }) => {
      setSelection({ scope: epoch, id })
      if (options?.center) {
        nonce.current += 1
        setCenterRequest({ id, nonce: nonce.current })
      }
    },
    [epoch],
  )

  const clear = useCallback(() => setSelection({ scope: epoch, id: null }), [epoch])

  const value = useMemo(
    () => ({ selectedId, centerRequest, select, clear }),
    [selectedId, centerRequest, select, clear],
  )
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
}
