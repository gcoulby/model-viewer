import { useContext } from 'react'
import { InstancesContext } from '@/contexts/instances-context'

export function useInstances() {
  const value = useContext(InstancesContext)
  if (!value) throw new Error('useInstances must be used within an InstancesProvider')
  return value
}
