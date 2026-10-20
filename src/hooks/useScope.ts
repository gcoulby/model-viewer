import { useContext } from 'react'
import { ScopeContext } from '@/contexts/scope-context'

export function useScope() {
  const value = useContext(ScopeContext)
  if (!value) throw new Error('useScope must be used within a ScopeProvider')
  return value
}
