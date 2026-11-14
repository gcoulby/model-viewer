import { useMemo, type ReactNode } from 'react'
import { ProblemsContext, type ProblemsContextValue } from '@/contexts/problems-context'
import { useEditorMode } from '@/hooks/useEditorMode'
import { useModels } from '@/hooks/useModels'
import { useWorkspaceDocs } from '@/hooks/useWorkspaceDocs'
import { refId } from '@/lib/ecore/edit/dom'
import { validate } from '@/lib/ecore/edit/validate'

const NONE: ProblemsContextValue = { problems: [], byRef: new Map(), within: new Set(), errors: 0, warnings: 0 }

/** Validates the open files after every change while editing. Viewing does not pay for it. */
export function ProblemsProvider({ children }: { children: ReactNode }) {
  const { mode } = useEditorMode()
  const { files } = useModels()
  const docs = useWorkspaceDocs()

  const value = useMemo<ProblemsContextValue>(() => {
    if (mode !== 'edit' || !files.length) return NONE
    const problems = validate(files, docs).sort((a, b) => Number(a.severity === 'warning') - Number(b.severity === 'warning'))
    const byRef = new Map<string, typeof problems>()
    const within = new Set<string>()
    for (const problem of problems) {
      const id = refId(problem.ref)
      const list = byRef.get(id)
      if (list) list.push(problem)
      else byRef.set(id, [problem])
      for (let n = problem.ref.path.length - 1; n >= 0; n--) within.add(refId({ key: problem.ref.key, path: problem.ref.path.slice(0, n) }))
    }
    const errors = problems.filter((p) => p.severity === 'error').length
    return { problems, byRef, within, errors, warnings: problems.length - errors }
  }, [mode, files, docs])

  return <ProblemsContext.Provider value={value}>{children}</ProblemsContext.Provider>
}
