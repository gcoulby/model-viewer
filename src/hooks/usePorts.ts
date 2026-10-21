import { useContext } from 'react'
import { PortsContext } from '@/contexts/ports-context'

export function usePorts() {
  const value = useContext(PortsContext)
  if (!value) throw new Error('usePorts must be used within a PortsProvider')
  return value
}
