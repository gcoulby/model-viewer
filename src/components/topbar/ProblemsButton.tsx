import { CircleCheckIcon } from 'lucide-react'
import { useState } from 'react'
import { ProblemIcon } from '@/components/edit/ProblemIcon'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useEditTarget } from '@/hooks/useEditTarget'
import { useModels } from '@/hooks/useModels'
import { useProblems } from '@/hooks/useProblems'
import { useWorkspaceDocs } from '@/hooks/useWorkspaceDocs'
import { elementAt } from '@/lib/ecore/edit/dom'
import { elementTrail } from '@/lib/ecore/edit/labels'
import { cn } from '@/lib/utils'

/** The count of problems in the open files, opening a list where each problem leads to its element. */
export function ProblemsButton() {
  const { problems, errors, warnings } = useProblems()
  const { files } = useModels()
  const docs = useWorkspaceDocs()
  const { setTarget } = useEditTarget()
  const [open, setOpen] = useState(false)
  const summary = !problems.length
    ? 'No problems'
    : [errors && `${errors} error${errors === 1 ? '' : 's'}`, warnings && `${warnings} warning${warnings === 1 ? '' : 's'}`]
        .filter(Boolean)
        .join(', ')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="ghost" aria-label={`Problems: ${summary}`} title="Problems in the open files" disabled={!files.length} />}
      >
        {errors > 0 ? (
          <ProblemIcon severity="error" className="size-4" />
        ) : warnings > 0 ? (
          <ProblemIcon severity="warning" className="size-4" />
        ) : (
          <CircleCheckIcon className="text-muted-foreground" />
        )}
        <span className={cn('font-mono text-xs', !problems.length && 'text-muted-foreground')}>{problems.length}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="border-b px-3 py-2">
          <p className="text-[13px] font-semibold">Problems</p>
          <p className="text-xs text-muted-foreground">{summary}</p>
        </div>
        {!problems.length ? (
          <p className="px-3 py-4 text-center text-[12.5px] text-muted-foreground">The open files pass every check.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto p-1">
            {files.map((file) => {
              const own = problems.filter((p) => p.ref.key === file.key)
              const doc = docs.get(file.key)
              if (!own.length || !doc) return null
              return (
                <div key={file.key}>
                  <p className="px-2 pt-2 pb-1 font-mono text-[11px] text-muted-foreground">{file.name}</p>
                  {own.map((problem, i) => {
                    const el = elementAt(doc, problem.ref.path)
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setTarget(problem.ref, { center: true })
                          setOpen(false)
                        }}
                        className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent"
                      >
                        <ProblemIcon severity={problem.severity} className="mt-0.5" />
                        <span className="min-w-0">
                          <span className="block text-[12.5px] leading-snug">{problem.message}</span>
                          {el && <span className="block truncate font-mono text-[11px] text-muted-foreground">{elementTrail(el)}</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
