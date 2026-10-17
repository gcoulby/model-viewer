import { useContext } from 'react'
import { ViewOptionsContext } from '@/contexts/view-options-context'

export function useViewOptions() {
  const value = useContext(ViewOptionsContext)
  if (!value) throw new Error('useViewOptions must be used within a ViewOptionsProvider')
  return value
}
