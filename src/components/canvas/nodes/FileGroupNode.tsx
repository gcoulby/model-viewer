import type { Node, NodeProps } from '@xyflow/react'
import { useFileColors } from '@/hooks/useFileColors'
import { useTheme } from '@/hooks/useTheme'
import { groupPaint } from '@/lib/ecore/paint'

export interface FileGroupData extends Record<string, unknown> {
  groupKey: string
  /** File whose colour tints the frame; null for the externals frame. */
  hueKey: string | null
  label: string
}

export type FileGroupNode = Node<FileGroupData, 'fileGroup'>

/** The tinted frame drawn behind the nodes of one file or package. */
export function FileGroupNodeView({ data, width, height }: NodeProps<FileGroupNode>) {
  const { theme } = useTheme()
  const { hueFor } = useFileColors()
  const paint = groupPaint(data.hueKey === null ? null : hueFor(data.hueKey), theme === 'dark')
  return (
    <div
      className="rounded-xl border-[1.5px] border-dashed"
      style={{ width, height, background: paint.fill, borderColor: paint.stroke }}
    >
      <span
        className="pointer-events-auto block h-[30px] cursor-grab truncate px-3.5 pt-2.5 font-mono text-[12.5px] font-medium active:cursor-grabbing"
        style={{ color: paint.label }}
      >
        {data.label}
      </span>
    </div>
  )
}
