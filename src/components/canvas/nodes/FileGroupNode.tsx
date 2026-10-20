import type { Node, NodeProps } from '@xyflow/react'
import { useFileColors } from '@/hooks/useFileColors'
import { useTheme } from '@/hooks/useTheme'
import { EXTERNAL_GROUP } from '@/lib/ecore/groups'
import { groupPaint } from '@/lib/ecore/paint'

export interface FileGroupData extends Record<string, unknown> {
  fileKey: string
  label: string
}

export type FileGroupNode = Node<FileGroupData, 'fileGroup'>

/** The tinted box drawn behind the nodes of one file. */
export function FileGroupNodeView({ data, width, height }: NodeProps<FileGroupNode>) {
  const { theme } = useTheme()
  const { hueFor } = useFileColors()
  const paint = groupPaint(data.fileKey === EXTERNAL_GROUP ? null : hueFor(data.fileKey), theme === 'dark')
  return (
    <div
      className="rounded-xl border-[1.5px] border-dashed"
      style={{ width, height, background: paint.fill, borderColor: paint.stroke }}
    >
      <span
        className="block truncate px-3.5 pt-2.5 font-mono text-[12.5px] font-medium"
        style={{ color: paint.label }}
      >
        {data.label}
      </span>
    </div>
  )
}
