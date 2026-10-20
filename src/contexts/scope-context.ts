import { createContext } from 'react'
import type { Scope } from '@/lib/ecore/scope'

export interface ScopeContextValue extends Scope {
  /** Focuses on the packages, or clears the focus if they already are the focus. */
  focusOn: (ids: string[], label: string) => void
  clearFocus: () => void
  setIncludeLinked: (include: boolean) => void
  /** Hides the packages, or shows them again if they are all hidden already. */
  toggleHidden: (ids: string[]) => void
  /** Shows every hidden package, keeping any focus. */
  showHidden: () => void
  /** Makes one package visible again, dropping a focus that leaves it out. */
  reveal: (scopeId: string) => void
}

export const ScopeContext = createContext<ScopeContextValue | null>(null)
