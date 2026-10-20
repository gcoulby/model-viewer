import { useRef, type ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { useLoadFiles } from '@/hooks/useLoadFiles'
import { filesFromFolderInput } from '@/lib/readFolder'

type OpenFolderButtonProps = Pick<ComponentProps<typeof Button>, 'variant'>

/** Scans a folder and its sub-folders for `.ecore` files, keeping their relative paths. */
export function OpenFolderButton({ variant = 'outline' }: OpenFolderButtonProps) {
  const input = useRef<HTMLInputElement>(null)
  const { loadFolder } = useLoadFiles()

  return (
    <>
      <Button variant={variant} onClick={() => input.current?.click()}>
        Open folder
      </Button>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        // Not in React's typings, but every major browser supports it.
        {...{ webkitdirectory: '' }}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length) void loadFolder(filesFromFolderInput(files))
        }}
      />
    </>
  )
}
