import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import type { EditOptions } from '@/contexts/models-context'
import { useEditTarget } from '@/hooks/useEditTarget'
import { useInstances } from '@/hooks/useInstances'
import { useModels } from '@/hooks/useModels'
import { elementAt, pathOf, type ElementRef } from '@/lib/ecore/edit/dom'
import { focusGoesToField } from '@/lib/keys'
import type { MetaClass, MetaFeature, Metamodel } from '@/lib/instance/metamodel'
import {
  createObject,
  createObjectAnywhere,
  createRootObject,
  duplicateObject,
  moveObject,
  referenceTokens,
  objectByFragment,
  removeObject,
  setReferences,
  shiftObject,
  type InstanceDocs,
} from '@/lib/instance/xmi'

/** Edits instances as undoable steps, moving the target to what each structural edit made or left behind. */
export function useInstanceEdit() {
  const { edit } = useModels()
  const { meta } = useInstances()
  const { setTarget } = useEditTarget()

  const run = useCallback(
    <T,>(label: string, change: (d: InstanceDocs, meta: Metamodel) => T, options?: EditOptions): T | undefined => {
      if (!meta) return undefined
      let result: T | undefined
      try {
        edit(label, (tx) => {
          result = change({ doc: tx.doc }, meta)
        }, options)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error))
        return undefined
      }
      return result
    },
    [edit, meta],
  )

  return useMemo(
    () => ({
      run,
      create(parent: ElementRef, feature: string, cls: MetaClass) {
        focusGoesToField()
        const ref = run(`add ${cls.name}`, (d, m) => createObject(d, m, parent, feature, cls))
        if (ref) setTarget(ref, { focusName: true, center: true })
      },
      /** A new root object in an existing file, beside the roots already there. */
      createRoot(key: string, cls: MetaClass) {
        focusGoesToField()
        const ref = run(`add ${cls.name}`, (d, m) => createRootObject(d, m, key, cls))
        if (ref) setTarget(ref, { focusName: true, center: true })
      },
      /**
       * A new object for `source`'s reference to point at, put wherever it fits in the file. The target stays
       * on `source`, so a form can be filled in one go.
       */
      createReferenced(source: ElementRef, feature: MetaFeature, cls: MetaClass) {
        const moved = run(`add ${cls.name}`, (d, m) => {
          const doc = d.doc(source.key)!
          const el = elementAt(doc, source.path)
          if (!el) throw new Error('That object no longer exists.')
          const made = createObjectAnywhere(d, m, source.key, cls)
          const at = { key: source.key, path: pathOf(el) }
          const kept = referenceTokens(el, feature).flatMap((t) => {
            const found = objectByFragment(m, doc, t)
            return found ? [{ key: source.key, path: pathOf(found) }] : []
          })
          setReferences(d, m, at, feature, feature.many ? [...kept, made] : [made])
          return at
        })
        if (moved) setTarget(moved)
      },
      duplicate(ref: ElementRef) {
        focusGoesToField()
        const copy = run('duplicate', (d, m) => duplicateObject(d, m, ref))
        if (copy) setTarget(copy, { focusName: true })
      },
      remove(ref: ElementRef) {
        const next = run('delete', (d, m) => removeObject(d, m, ref))
        if (next !== undefined) setTarget(next)
      },
      move(ref: ElementRef, parent: ElementRef, before: ElementRef | null) {
        const moved = run('move', (d, m) => moveObject(d, m, ref, parent, before))
        if (moved) setTarget(moved)
      },
      shift(ref: ElementRef, delta: -1 | 1) {
        const moved = run(delta < 0 ? 'move up' : 'move down', (d, m) => shiftObject(d, m, ref, delta))
        if (moved) setTarget(moved)
      },
    }),
    [run, setTarget],
  )
}
