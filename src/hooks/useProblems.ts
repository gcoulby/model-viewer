import { useContext } from 'react'
import { ProblemsContext } from '@/contexts/problems-context'

export function useProblems() {
  const value = useContext(ProblemsContext)
  if (!value) throw new Error('useProblems must be used within a ProblemsProvider')
  return value
}
