import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useModels } from '@/hooks/useModels'
import { downloadFiles } from '@/lib/workspace/save'

/**
 * Closing a file throws away its unsaved changes and cannot be undone, so a file with changes asks first.
 * Render `dialog` once and call `requestClose` from the close button.
 */
export function useConfirmClose() {
  const { files, dirtyKeys, removeModel, markSaved } = useModels()
  const [pending, setPending] = useState<string | null>(null)

  const requestClose = useCallback(
    (key: string) => {
      if (dirtyKeys.has(key)) setPending(key)
      else removeModel(key)
    },
    [dirtyKeys, removeModel],
  )

  const file = files.find((f) => f.key === pending)
  const close = () => {
    if (pending) removeModel(pending)
    setPending(null)
  }

  const dialog = (
    <Dialog open={!!file} onOpenChange={(open) => !open && setPending(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close {file?.name}?</DialogTitle>
          <DialogDescription>It has changes you haven't saved. Closing it throws them away.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPending(null)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={close}>
            Close without saving
          </Button>
          <Button
            onClick={async () => {
              if (!file) return
              await downloadFiles([file])
              markSaved([file.key])
              close()
            }}
          >
            Save and close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { requestClose, dialog }
}
