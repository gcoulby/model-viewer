import { useContext } from 'react'
import { SelectionContext } from '@/contexts/selection-context'

export function useSelection() {
  const value = useContext(SelectionContext)
  if (!value) throw new Error('useSelection must be used within a SelectionProvider')
  return value
}
