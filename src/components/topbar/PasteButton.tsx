import { Button } from '@/components/ui/button'
import { usePasteDialog } from '@/hooks/usePasteDialog'

export function PasteButton() {
  const { setOpen } = usePasteDialog()
  return (
    <Button variant="outline" onClick={() => setOpen(true)}>
      Paste XML
    </Button>
  )
}
