import { useMemo, type ReactNode } from 'react'
import { InstancesContext } from '@/contexts/instances-context'
import { useEditorMode } from '@/hooks/useEditorMode'
import { useModels } from '@/hooks/useModels'
import { useWorkspaceDocs } from '@/hooks/useWorkspaceDocs'
import { buildMetamodel } from '@/lib/instance/metamodel'
import type { InstanceFile } from '@/lib/instance/objectGraph'
import { isInstanceDoc } from '@/lib/instance/xmi'

/** Sorts the open files into metamodels and instances, and indexes the metamodels while instances are edited. */
export function InstancesProvider({ children }: { children: ReactNode }) {
  const { mode } = useEditorMode()
  const { files, models, links } = useModels()
  const docs = useWorkspaceDocs()

  const instanceFiles = useMemo<InstanceFile[]>(
    () =>
      files.flatMap((f) => {
        const doc = docs.get(f.key)
        return doc && isInstanceDoc(doc) ? [{ key: f.key, name: f.name, index: f.index, doc }] : []
      }),
    [files, docs],
  )
  const instanceKeys = useMemo(() => new Set(instanceFiles.map((f) => f.key)), [instanceFiles])
  const meta = useMemo(() => (mode === 'instance' ? buildMetamodel(models, links) : null), [mode, models, links])

  const value = useMemo(() => ({ meta, instanceFiles, instanceKeys }), [meta, instanceFiles, instanceKeys])
  return <InstancesContext.Provider value={value}>{children}</InstancesContext.Provider>
}
