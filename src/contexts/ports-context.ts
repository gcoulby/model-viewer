import { createContext } from 'react'
import type { PortOverrides } from '@/lib/ecore/ports'

export interface PortsContextValue {
  /** Links ported, or drawn as lines, by hand, whatever the port mode says. */
  overrides: PortOverrides
  /** Changes every time `overrides` does, so the layout can tell it is out of date. */
  version: number
  setPorted: (edgeId: string, ported: boolean) => void
  /** Drops every choice made by hand. */
  reset: () => void
}

export const PortsContext = createContext<PortsContextValue | null>(null)
