import { useContext } from 'react'
import { ModelsContext } from '@/contexts/models-context'

export function useModels() {
  const value = useContext(ModelsContext)
  if (!value) throw new Error('useModels must be used within a ModelsProvider')
  return value
}
