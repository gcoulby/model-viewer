import { useContext } from 'react'
import { EditTargetContext } from '@/contexts/edit-target-context'

export function useEditTarget() {
  const value = useContext(EditTargetContext)
  if (!value) throw new Error('useEditTarget must be used within an EditTargetProvider')
  return value
}
