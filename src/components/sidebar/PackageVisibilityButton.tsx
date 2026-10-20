import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScope } from '@/hooks/useScope'

/** Hides or shows the packages named by `ids` on the diagram. */
export function PackageVisibilityButton({ ids, name }: { ids: string[]; name: string }) {
  const { hidden, toggleHidden } = useScope()
  const isHidden = ids.every((id) => hidden.has(id))
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      className="size-6 text-muted-foreground"
      aria-label={`${isHidden ? 'Show' : 'Hide'} ${name}`}
      aria-pressed={isHidden}
      title={isHidden ? 'Show on the diagram' : 'Hide from the diagram'}
      onClick={() => toggleHidden(ids)}
    >
      {isHidden ? <EyeOffIcon /> : <EyeIcon />}
    </Button>
  )
}
