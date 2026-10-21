import { kindLabel } from '@/lib/ecore/format'
import type { GraphNode } from '@/types/graph'
import { PanelTitle } from './PanelTitle'

interface DetailHeaderProps {
  node: GraphNode
  onClose: () => void
}

export function DetailHeader({ node, onClose }: DetailHeaderProps) {
  const pkg = node.kind === 'external' ? null : node.package
  return (
    <PanelTitle
      title={node.name}
      lines={[`${kindLabel(node)}${pkg ? ` in ${pkg.fullName}` : ''}`, pkg?.nsURI, pkg?.fileName]}
      onClose={onClose}
    />
  )
}
