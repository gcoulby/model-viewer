import { useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEditorMode } from '@/hooks/useEditorMode'
import { useModels } from '@/hooks/useModels'
import { filterTree } from '@/lib/ecore/treeModel'
import { ModelTreeFile } from './ModelTreeFile'
import { ModelTreeToolbar } from './ModelTreeToolbar'
import { TreeOpenProvider } from './TreeOpenProvider'

export function ModelTree({ query }: { query: string }) {
  const { models } = useModels()
  const normalised = query.trim().toLowerCase()
  const editing = useEditorMode().mode === 'edit'
  const files = useMemo(() => filterTree(models, normalised, editing), [models, normalised, editing])

  return (
    <TreeOpenProvider>
      <ModelTreeToolbar />
    <ScrollArea className="min-h-0 flex-1">
      <nav aria-label="Model tree" className="p-1.5 pb-2.5">
        {!models.length && (
          <p className="px-2 py-1.5 text-muted-foreground">Open a file to see its packages and types here.</p>
        )}
        {models.length > 0 && !files.length && (
          <p className="px-2 py-1.5 text-muted-foreground">Nothing matches “{query.trim()}”.</p>
        )}
        {files.map((file) => (
          <ModelTreeFile key={file.model.key} file={file} />
        ))}
      </nav>
    </ScrollArea>
    </TreeOpenProvider>
  )
}
