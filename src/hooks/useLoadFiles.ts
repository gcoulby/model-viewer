import { useCallback } from 'react'
import { toast } from 'sonner'
import type { Sample } from '@/data/samples'
import type { AddResult } from '@/contexts/models-context'
import { useModels } from '@/hooks/useModels'
import { readDropped, type SourceFile } from '@/lib/readFolder'

const ERROR_TOAST_MS = 7000

function reportErrors(errors: string[]) {
  if (!errors.length) return
  const extra = errors.length > 1 ? ` (and ${errors.length - 1} more)` : ''
  toast.error(`${errors[0]}${extra}`, { duration: ERROR_TOAST_MS })
}

/** Loads files, pasted XML and the sample, reporting parse failures as a toast. */
export function useLoadFiles() {
  const { addSources, addPasted } = useModels()

  const loadSourceFiles = useCallback(
    async (files: SourceFile[]): Promise<AddResult> => {
      const sources = await Promise.all(files.map(async (f) => ({ name: f.path, text: await f.file.text() })))
      const result = addSources(sources)
      reportErrors(result.errors)
      return result
    },
    [addSources],
  )

  const loadFiles = useCallback(
    (files: File[]) => loadSourceFiles(files.map((file) => ({ file, path: file.name }))),
    [loadSourceFiles],
  )

  /** Loads the `.ecore` files found in a chosen or dropped folder, keeping their relative paths. */
  const loadFolder = useCallback(
    async (files: SourceFile[]): Promise<AddResult> => {
      if (!files.length) {
        toast.error('No .ecore files were found in that folder.')
        return { added: 0, errors: [] }
      }
      return loadSourceFiles(files)
    },
    [loadSourceFiles],
  )

  /** Loads whatever was dropped, whether files or folders. Call synchronously from the drop handler. */
  const loadDropped = useCallback(
    async (data: DataTransfer) => {
      const { files, scanned } = await readDropped(data)
      if (scanned) await loadFolder(files)
      else if (files.length) await loadSourceFiles(files)
    },
    [loadFolder, loadSourceFiles],
  )

  const loadPasted = useCallback(
    (text: string): AddResult => {
      const result = addPasted(text)
      reportErrors(result.errors)
      return result
    },
    [addPasted],
  )

  const loadSample = useCallback(
    (sample: Sample) => {
      reportErrors(addSources(sample.files).errors)
    },
    [addSources],
  )

  return { loadFiles, loadFolder, loadDropped, loadPasted, loadSample }
}
