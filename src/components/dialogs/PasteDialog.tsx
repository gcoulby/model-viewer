import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useLoadFiles } from '@/hooks/useLoadFiles'
import { usePasteDialog } from '@/hooks/usePasteDialog'

export function PasteDialog() {
  const { open, setOpen } = usePasteDialog()
  const { loadPasted } = useLoadFiles()
  const [text, setText] = useState('')

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    const { added } = loadPasted(trimmed)
    setOpen(false)
    if (added) setText('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Paste Ecore XML</DialogTitle>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          aria-label="Ecore XML"
          placeholder="<ecore:EPackage ...>"
          className="h-[46vh] resize-y font-mono text-xs"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Draw diagram</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
