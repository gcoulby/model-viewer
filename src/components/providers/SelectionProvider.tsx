import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { SelectionContext, type CenterRequest } from '@/contexts/selection-context'
import { useModels } from '@/hooks/useModels'
import type { ParsedModel } from '@/types/ecore'

interface Selection {
  /** The model set the selection was made against; a different set invalidates it. */
  scope: ParsedModel[]
  id: string | null
}

export function SelectionProvider({ children }: { children: ReactNode }) {
  const { models } = useModels()
  const [selection, setSelection] = useState<Selection>({ scope: models, id: null })
  const [centerRequest, setCenterRequest] = useState<CenterRequest | null>(null)
  const nonce = useRef(0)

  const selectedId = selection.scope === models ? selection.id : null

  const select = useCallback(
    (id: string, options?: { center?: boolean }) => {
      setSelection({ scope: models, id })
      if (options?.center) {
        nonce.current += 1
        setCenterRequest({ id, nonce: nonce.current })
      }
    },
    [models],
  )

  const clear = useCallback(() => setSelection({ scope: models, id: null }), [models])

  const value = useMemo(
    () => ({ selectedId, centerRequest, select, clear }),
    [selectedId, centerRequest, select, clear],
  )
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
}
