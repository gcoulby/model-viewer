import { useCallback } from 'react'
import { toast } from 'sonner'
import { useModels } from '@/hooks/useModels'
import { downloadFiles } from '@/lib/workspace/save'

/** Saving downloads files from the workspace: the changed ones, or every open file. */
export function useSaveFiles() {
  const { files, dirtyKeys, markSaved } = useModels()

  const save = useCallback(async () => {
    const changed = files.filter((f) => dirtyKeys.has(f.key))
    if (!changed.length) {
      toast('Everything is saved.')
      return
    }
    await downloadFiles(changed, 'ecore-changes.zip')
    markSaved(changed.map((f) => f.key))
  }, [files, dirtyKeys, markSaved])

  const downloadAll = useCallback(async () => {
    if (!files.length) return
    await downloadFiles(files)
    markSaved(files.map((f) => f.key))
  }, [files, markSaved])

  return { save, downloadAll, unsaved: dirtyKeys.size }
}
