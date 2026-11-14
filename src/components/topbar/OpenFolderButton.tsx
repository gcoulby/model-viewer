import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { useFilePickers } from '@/hooks/useFilePickers'

type OpenFolderButtonProps = Pick<ComponentProps<typeof Button>, 'variant'>

/** Scans a folder and its sub-folders for `.ecore` files, keeping their relative paths. */
export function OpenFolderButton({ variant = 'outline' }: OpenFolderButtonProps) {
  const { openFolder, inputs } = useFilePickers()
  return (
    <>
      <Button variant={variant} onClick={openFolder}>
        Open folder
      </Button>
      {inputs}
    </>
  )
}
