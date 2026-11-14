import { useMemo } from 'react'
import { useModels } from '@/hooks/useModels'
import type { WorkspaceFile } from '@/lib/workspace/workspace'
import { parseXml } from '@/lib/workspace/xml'

// Files are immutable and only replaced when edited, so each is parsed once for display.
const docs = new WeakMap<WorkspaceFile, Document | null>()

function docOf(file: WorkspaceFile): Document | null {
  if (!docs.has(file)) {
    let doc: Document | null = null
    try {
      doc = parseXml(file.text)
    } catch {
      // Loading checks files, so this is not expected; the file is then shown without contents.
    }
    docs.set(file, doc)
  }
  return docs.get(file) ?? null
}

/**
 * Each open file's XML document, for reading only: the tree and the Properties panel show these, while
 * edits work on fresh copies through `useModels().edit`. Never change these documents.
 */
export function useWorkspaceDocs(): ReadonlyMap<string, Document> {
  const { files } = useModels()
  return useMemo(() => {
    const map = new Map<string, Document>()
    for (const file of files) {
      const doc = docOf(file)
      if (doc) map.set(file.key, doc)
    }
    return map
  }, [files])
}
