import { useContext } from 'react'
import { TreeOpenContext } from '@/contexts/tree-open-context'

export function useTreeOpen() {
  const value = useContext(TreeOpenContext)
  if (!value) throw new Error('useTreeOpen must be used within a TreeOpenProvider')
  return value
}
