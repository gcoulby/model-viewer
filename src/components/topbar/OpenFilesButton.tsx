import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { useFilePickers } from '@/hooks/useFilePickers'

type OpenFilesButtonProps = Pick<ComponentProps<typeof Button>, 'variant'>

export function OpenFilesButton({ variant = 'default' }: OpenFilesButtonProps) {
  const { openFiles, inputs } = useFilePickers()
  return (
    <>
      <Button variant={variant} onClick={openFiles}>
        Open files
      </Button>
      {inputs}
    </>
  )
}
