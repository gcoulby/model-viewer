import { createContext } from 'react'

export interface CenterRequest {
  id: string
  /** Distinguishes repeated requests for the same node. */
  nonce: number
}

export interface SelectionContextValue {
  selectedId: string | null
  centerRequest: CenterRequest | null
  select: (id: string, options?: { center?: boolean }) => void
  clear: () => void
}

export const SelectionContext = createContext<SelectionContextValue | null>(null)
