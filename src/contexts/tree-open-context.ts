import { createContext } from 'react'

export interface TreeOpenContextValue {
  isOpen: (id: string) => boolean
  setOpen: (id: string, open: boolean) => void
  expandAll: () => void
  collapseAll: () => void
}

export const TreeOpenContext = createContext<TreeOpenContextValue | null>(null)
