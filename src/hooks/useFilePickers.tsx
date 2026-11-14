import { useCallback, useRef } from 'react'
import { ACCEPTED_FILES } from '@/data/acceptedFiles'
import { useLoadFiles } from '@/hooks/useLoadFiles'
import { filesFromFolderInput } from '@/lib/readFolder'

const ACCEPT = `${ACCEPTED_FILES.join(',')},text/xml,application/xml`

/**
 * The file and folder pickers. Render `inputs` once; `openFiles` and `openFolder` then open the browser's
 * picker from any button or menu item.
 */
export function useFilePickers() {
  const filesInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)
  const { loadFiles, loadFolder } = useLoadFiles()

  const openFiles = useCallback(() => filesInput.current?.click(), [])
  const openFolder = useCallback(() => folderInput.current?.click(), [])

  const inputs = (
    <>
      <input
        ref={filesInput}
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
      <input
        ref={folderInput}
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

  return { openFiles, openFolder, inputs }
}
