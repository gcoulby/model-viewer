import { useContext } from 'react'
import { FileColorsContext } from '@/contexts/file-colors-context'

export function useFileColors() {
  const value = useContext(FileColorsContext)
  if (!value) throw new Error('useFileColors must be used within a FileColorsProvider')
  return value
}
