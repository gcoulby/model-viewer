import { Handle, Position } from '@xyflow/react'
import { useFileColors } from '@/hooks/useFileColors'
import { useTheme } from '@/hooks/useTheme'
import { paintForNode } from '@/lib/ecore/paint'
import { cn } from '@/lib/utils'
import type { DiagramNodeData } from './nodeTypes'

interface NodeFrameProps {
  data: DiagramNodeData
  selected: boolean
  dashed?: boolean
}

const HANDLE_CLASS = 'pointer-events-none !size-0 !min-h-0 !min-w-0 !border-0 !opacity-0'

/** Header, stereotype and compartments shared by every node type. */
export function NodeFrame({ data, selected, dashed = false }: NodeFrameProps) {
  const { theme } = useTheme()
  const { hueFor } = useFileColors()
  const { node, geometry } = data
  const paint = paintForNode(node, theme === 'dark', hueFor)
  const italic = node.kind === 'class' && node.abstract

  return (
    <div
      className={cn(
        'cursor-pointer overflow-hidden rounded-md bg-node text-foreground',
        selected ? 'border-[2.4px]' : 'border-[1.2px]',
        dashed && 'border-dashed',
      )}
      style={{
        width: geometry.width,
        height: geometry.height,
        borderColor: selected ? 'var(--selection)' : paint.stroke,
      }}
      title={node.kind === 'external' ? node.name : `${node.name}  (${node.package.fullName})`}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Top} isConnectable={false} className={HANDLE_CLASS} />
      <div
        className="flex flex-col items-center justify-center border-b px-2 text-center"
        style={{ height: geometry.headerHeight, background: paint.header, borderColor: paint.stroke }}
      >
        {geometry.stereotype && (
          <span className="text-[10.5px] leading-[14px] text-muted-foreground italic">{geometry.stereotype}</span>
        )}
        <span className={cn('max-w-full truncate text-[13px] leading-[18px] font-semibold', italic && 'italic')}>
          {node.name}
        </span>
      </div>
      {geometry.compartments.map((rows, i) => (
        <div
          key={i}
          className={cn('px-2.5 py-[5px] font-mono text-[11.5px]', i > 0 && 'border-t')}
          style={{ borderColor: paint.stroke }}
        >
          {rows.map((row, j) => (
            <div key={j} className="h-4 truncate leading-4 whitespace-pre">
              {row}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
