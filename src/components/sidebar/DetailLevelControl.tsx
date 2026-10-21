import { DETAIL_LEVELS } from '@/data/layoutOptions'
import { useModels } from '@/hooks/useModels'
import { useScope } from '@/hooks/useScope'
import { fileScopeIds } from '@/lib/ecore/scope'
import { SegmentedControl } from './SegmentedControl'

/** Switches every package between its types and one box; neither is picked while only some are collapsed. */
export function DetailLevelControl() {
  const { models } = useModels()
  const { folded, setFolded } = useScope()
  const all = models.flatMap(fileScopeIds)
  const value = folded.size === 0 ? 'types' : all.every((id) => folded.has(id)) ? 'packages' : null
  return (
    <SegmentedControl
      label="Level of detail"
      value={value}
      choices={DETAIL_LEVELS}
      onChange={(level) => setFolded(level === 'packages' ? all : [])}
    />
  )
}
