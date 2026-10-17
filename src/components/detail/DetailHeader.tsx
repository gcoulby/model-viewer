import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { kindLabel } from '@/lib/ecore/format'
import type { GraphNode } from '@/types/graph'

interface DetailHeaderProps {
  node: GraphNode
  onClose: () => void
}

export function DetailHeader({ node, onClose }: DetailHeaderProps) {
  const pkg = node.kind === 'external' ? null : node.package
  return (
    <div>
      <div className="flex items-start gap-2">
        <h2 className="flex-1 text-[19px] leading-tight font-semibold break-words">{node.name}</h2>
        <Button variant="ghost" size="icon-sm" aria-label="Close details" onClick={onClose}>
          <XIcon />
        </Button>
      </div>
      <p className="mt-0.5 text-[12.5px] break-words text-muted-foreground">
        {kindLabel(node)}
        {pkg && ` in ${pkg.fullName}`}
      </p>
      {pkg?.nsURI && <p className="mt-0.5 text-[12.5px] break-words text-muted-foreground">{pkg.nsURI}</p>}
      {pkg && <p className="mt-0.5 text-[12.5px] break-words text-muted-foreground">{pkg.fileName}</p>}
    </div>
  )
}
