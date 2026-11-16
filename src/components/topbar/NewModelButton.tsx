import { FilePlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditTarget } from '@/hooks/useEditTarget'
import { useModels } from '@/hooks/useModels'
import { focusGoesToField } from '@/lib/keys'

/** Starts a new, empty metamodel file and puts its package's name up for typing. */
export function NewModelButton() {
  const { createModel } = useModels()
  const { setTarget } = useEditTarget()
  return (
    <Button
      variant="outline"
      title="Start a new .ecore file"
      onClick={() => {
        focusGoesToField()
        const key = createModel()
        setTarget({ key, path: [] }, { center: true, focusName: true })
      }}
    >
      <FilePlusIcon />
      New model
    </Button>
  )
}
