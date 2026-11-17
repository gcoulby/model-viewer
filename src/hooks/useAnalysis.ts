import { useMemo } from 'react'
import { useModels } from '@/hooks/useModels'
import { useProblems } from '@/hooks/useProblems'
import { analyze, type Report } from '@/lib/analysis/analyze'
import { buildMetamodel, type Metamodel } from '@/lib/instance/metamodel'

/** The open metamodels, measured: the report Analysis mode shows and downloads. */
export function useAnalysis(): { meta: Metamodel; report: Report } | null {
  const { models, links } = useModels()
  const { problems } = useProblems()
  return useMemo(() => {
    if (!models.length) return null
    const meta = buildMetamodel(models, links)
    return { meta, report: analyze(meta, models, problems) }
  }, [models, links, problems])
}
