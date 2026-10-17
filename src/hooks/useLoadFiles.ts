import { useCallback } from 'react'
import { toast } from 'sonner'
import type { Sample } from '@/data/samples'
import type { AddResult } from '@/contexts/models-context'
import { useModels } from '@/hooks/useModels'

const ERROR_TOAST_MS = 7000

function reportErrors(errors: string[]) {
  if (!errors.length) return
  const extra = errors.length > 1 ? ` (and ${errors.length - 1} more)` : ''
  toast.error(`${errors[0]}${extra}`, { duration: ERROR_TOAST_MS })
}

/** Loads files, pasted XML and the sample, reporting parse failures as a toast. */
export function useLoadFiles() {
  const { addSources, addPasted } = useModels()

  const loadFiles = useCallback(
    async (files: File[]): Promise<AddResult> => {
      const sources = await Promise.all(files.map(async (f) => ({ name: f.name, text: await f.text() })))
      const result = addSources(sources)
      reportErrors(result.errors)
      return result
    },
    [addSources],
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

  return { loadFiles, loadPasted, loadSample }
}
