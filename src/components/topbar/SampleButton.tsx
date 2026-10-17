import { Button } from '@/components/ui/button'
import { useLoadFiles } from '@/hooks/useLoadFiles'

export function SampleButton({ label = 'Sample' }: { label?: string }) {
  const { loadSample } = useLoadFiles()
  return (
    <Button variant="outline" onClick={loadSample}>
      {label}
    </Button>
  )
}
