import { useContext } from 'react'
import { DiagramContext } from '@/contexts/diagram-context'

export function useDiagram() {
  const value = useContext(DiagramContext)
  if (!value) throw new Error('useDiagram must be used within a DiagramProvider')
  return value
}
