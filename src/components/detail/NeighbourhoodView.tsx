import { useMemo, type MouseEvent } from 'react'
import { useSelectNode } from '@/hooks/useSelectNode'
import type { NeighbourhoodRender } from '@/hooks/useNeighbourhood'
import type { DiagramSvg } from '@/lib/ecore/export'
import { cn } from '@/lib/utils'

interface NeighbourhoodViewProps {
  build: (render: NeighbourhoodRender) => DiagramSvg | null
  selectedId: string
  label: string
  className?: string
}

/** Draws a neighbourhood SVG; clicking another type in it selects that type. */
export function NeighbourhoodView({ build, selectedId, label, className }: NeighbourhoodViewProps) {
  const selectNode = useSelectNode()
  const svg = useMemo(() => build({ fluid: true, clickable: true }), [build])
  if (!svg) return null

  const onClick = (event: MouseEvent) => {
    const id = (event.target as Element).closest('[data-node-id]')?.getAttribute('data-node-id')
    if (id && id !== selectedId) selectNode(id)
  }

  return (
    <div
      role="img"
      aria-label={label}
      onClick={onClick}
      className={cn('rounded-md border bg-background p-1.5', className)}
      dangerouslySetInnerHTML={{ __html: svg.text }}
    />
  )
}
