import type { MouseEvent } from 'react'
import type { PortTag } from '@/lib/ecore/edgeGeometry'
import { PORT_FONT_SIZE, portTagShape } from '@/lib/ecore/portTag'

interface PortTagViewProps {
  tag: PortTag
  text: string
  /** True at the link's source end, where the tag points away from the box. */
  outgoing: boolean
  title: string
  onClick: () => void
}

/** One end of a ported link: a net tag naming the far end, which jumps there when clicked. */
export function PortTagView({ tag, text, outgoing, title, onClick }: PortTagViewProps) {
  const shape = portTagShape(tag, text, outgoing)
  const handleClick = (event: MouseEvent) => {
    event.stopPropagation()
    onClick()
  }
  return (
    <g transform={shape.transform} className="pointer-events-auto cursor-pointer" onClick={handleClick}>
      <title>{title}</title>
      <polygon points={shape.points} className="fill-node stroke-edge" strokeWidth={1.2} strokeLinejoin="round" />
      <text
        x={shape.textX}
        textAnchor={shape.anchor}
        dominantBaseline="central"
        fontSize={PORT_FONT_SIZE}
        className="fill-foreground font-mono"
      >
        {text}
      </text>
    </g>
  )
}
