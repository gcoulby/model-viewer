import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SAMPLES } from '@/data/samples'
import { useLoadFiles } from '@/hooks/useLoadFiles'

export function SampleButton({ label = 'Samples' }: { label?: string }) {
  const { loadSample } = useLoadFiles()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>{label}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {SAMPLES.map((sample) => (
          <DropdownMenuItem key={sample.id} onClick={() => loadSample(sample)} className="flex-col items-start gap-0">
            <span className="font-medium">{sample.label}</span>
            <span className="text-xs text-muted-foreground">{sample.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
