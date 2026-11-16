import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import type { EditOptions } from '@/contexts/models-context'
import { useEditTarget } from '@/hooks/useEditTarget'
import { useInstances } from '@/hooks/useInstances'
import { useModels } from '@/hooks/useModels'
import type { ElementRef } from '@/lib/ecore/edit/dom'
import { focusGoesToField } from '@/lib/keys'
import type { NewChildSpec } from '@/lib/ecore/edit/kinds'
import { createChild, duplicate, move, remove, shift, type EditDocs } from '@/lib/ecore/edit/ops'

/**
 * Edits the model as undoable steps. `run` applies any edit operation; the rest are the structural edits
 * the tree offers, which also move the target to what they made or left behind.
 */
export function useModelEdit() {
  const { edit } = useModels()
  const { setTarget } = useEditTarget()
  const { instanceKeys } = useInstances()

  const run = useCallback(
    <T,>(label: string, change: (d: EditDocs) => T, options?: EditOptions): T | undefined => {
      let result: T | undefined
      try {
        edit(label, (tx) => {
          // Metamodel edits refactor metamodels only; instances name their classes another way.
          result = change({ files: tx.files.filter((f) => !instanceKeys.has(f.key)), doc: tx.doc })
        }, options)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error))
        return undefined
      }
      return result
    },
    [edit, instanceKeys],
  )

  return useMemo(
    () => ({
      run,
      create(parent: ElementRef, spec: NewChildSpec, after?: ElementRef) {
        focusGoesToField()
        const ref = run(`add ${spec.label.toLowerCase()}`, (d) => createChild(d, parent, spec, after))
        if (ref) setTarget(ref, { focusName: true, center: true })
      },
      duplicate(ref: ElementRef) {
        focusGoesToField()
        const copy = run('duplicate', (d) => duplicate(d, ref))
        if (copy) setTarget(copy, { focusName: true })
      },
      remove(ref: ElementRef) {
        const next = run('delete', (d) => remove(d, ref))
        if (next !== undefined) setTarget(next)
      },
      move(ref: ElementRef, parent: ElementRef, before: ElementRef | null) {
        const moved = run('move', (d) => move(d, ref, parent, before))
        if (moved) setTarget(moved)
      },
      shift(ref: ElementRef, delta: -1 | 1) {
        const moved = run(delta < 0 ? 'move up' : 'move down', (d) => shift(d, ref, delta))
        if (moved) setTarget(moved)
      },
    }),
    [run, setTarget],
  )
}
