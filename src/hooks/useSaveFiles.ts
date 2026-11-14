import { useCallback } from 'react'
import { toast } from 'sonner'
import { useModels } from '@/hooks/useModels'
import { useProblems } from '@/hooks/useProblems'
import { downloadFiles } from '@/lib/workspace/save'

/** Saving downloads files from the workspace: the changed ones, or every open file. */
export function useSaveFiles() {
  const { files, dirtyKeys, markSaved } = useModels()
  const { problems } = useProblems()

  const save = useCallback(async () => {
    const changed = files.filter((f) => dirtyKeys.has(f.key))
    if (!changed.length) {
      toast('Everything is saved.')
      return
    }
    await downloadFiles(changed, 'ecore-changes.zip')
    markSaved(changed.map((f) => f.key))
    // Saving is never blocked, but a file with errors may not load in Eclipse, so say so.
    const keys = new Set(changed.map((f) => f.key))
    const errors = problems.filter((p) => p.severity === 'error' && keys.has(p.ref.key)).length
    if (errors) toast.warning(`Saved with ${errors} error${errors === 1 ? '' : 's'}. The Problems list shows where.`)
  }, [files, dirtyKeys, markSaved, problems])

  const downloadAll = useCallback(async () => {
    if (!files.length) return
    await downloadFiles(files)
    markSaved(files.map((f) => f.key))
  }, [files, markSaved])

  return { save, downloadAll, unsaved: dirtyKeys.size }
}
