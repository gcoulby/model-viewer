import { useRef, type ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { ACCEPTED_FILES } from '@/data/acceptedFiles'
import { useLoadFiles } from '@/hooks/useLoadFiles'

const ACCEPT = `${ACCEPTED_FILES.join(',')},text/xml,application/xml`

type OpenFilesButtonProps = Pick<ComponentProps<typeof Button>, 'variant'>

export function OpenFilesButton({ variant = 'default' }: OpenFilesButtonProps) {
  const input = useRef<HTMLInputElement>(null)
  const { loadFiles } = useLoadFiles()

  return (
    <>
      <Button variant={variant} onClick={() => input.current?.click()}>
        Open files
      </Button>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        accept={ACCEPT}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length) void loadFiles(files)
        }}
      />
    </>
  )
}
