import { PackageIcon, PackageOpenIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScope } from '@/hooks/useScope'

/** Collapses one package into a single box on the diagram, or expands it again. */
export function PackageFoldButton({ scopeId, name }: { scopeId: string; name: string }) {
  const { folded, toggleFolded } = useScope()
  const isFolded = folded.has(scopeId)
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      className="size-6 text-muted-foreground"
      aria-label={`${isFolded ? 'Expand' : 'Collapse'} ${name}`}
      aria-pressed={isFolded}
      title={isFolded ? 'Expand into its types' : 'Collapse into one box'}
      onClick={() => toggleFolded([scopeId])}
    >
      {isFolded ? <PackageIcon /> : <PackageOpenIcon />}
    </Button>
  )
}
