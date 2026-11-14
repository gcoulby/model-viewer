// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { SAMPLES } from '@/data/samples'
import { parseModel } from '@/lib/ecore/parse'
import { newModelText } from '../newModel'
import { EMPTY_WORKSPACE, freeName, isDirty, workspaceReducer as reduce, type WorkspaceState } from '../workspace'
import { parseXml, serializeXml } from '../xml'

const library = SAMPLES[0]!.files[0]!.text

function withFiles(...names: string[]): WorkspaceState {
  return reduce(EMPTY_WORKSPACE, { type: 'add', files: names.map((name) => ({ name, text: `<${name}/>` })) })
}

const edit = (state: WorkspaceState, key: string, after: string, coalesce: string | null = null, time = 0) =>
  reduce(state, { type: 'edit', label: 'change', changes: [{ key, after }], coalesce, time })

describe('workspaceReducer', () => {
  it('adds files sorted, clean, with stable indexes', () => {
    const state = withFiles('b.ecore', 'A.ecore')
    expect(state.files.map((f) => f.key)).toEqual(['a.ecore', 'b.ecore'])
    expect(state.files.every((f) => !isDirty(f))).toBe(true)
    const reloaded = reduce(state, { type: 'add', files: [{ name: 'b.ecore', text: '<new/>' }] })
    expect(reloaded.files.find((f) => f.key === 'b.ecore')?.index).toBe(state.files[1]!.index)
    expect(reloaded.epoch).toBe(state.epoch + 1)
  })

  it('records edits, undoes and redoes them, without touching the epoch', () => {
    const start = withFiles('a.ecore')
    const edited = edit(start, 'a.ecore', '<changed/>')
    expect(edited.files[0]!.text).toBe('<changed/>')
    expect(isDirty(edited.files[0]!)).toBe(true)
    expect(edited.epoch).toBe(start.epoch)
    const undone = reduce(edited, { type: 'undo' })
    expect(undone.files[0]!.text).toBe('<a.ecore/>')
    expect(isDirty(undone.files[0]!)).toBe(false)
    const redone = reduce(undone, { type: 'redo' })
    expect(redone.files[0]!.text).toBe('<changed/>')
  })

  it('ignores an edit that changes nothing', () => {
    const start = withFiles('a.ecore')
    expect(edit(start, 'a.ecore', '<a.ecore/>')).toBe(start)
  })

  it('merges edits with the same coalesce key made close together', () => {
    let state = withFiles('a.ecore')
    state = edit(state, 'a.ecore', '<x/>', 'name', 0)
    state = edit(state, 'a.ecore', '<xy/>', 'name', 500)
    state = edit(state, 'a.ecore', '<xyz/>', 'name', 900)
    expect(state.undo).toHaveLength(1)
    state = edit(state, 'a.ecore', '<later/>', 'name', 5000)
    expect(state.undo).toHaveLength(2)
    state = reduce(reduce(state, { type: 'undo' }), { type: 'undo' })
    expect(state.files[0]!.text).toBe('<a.ecore/>')
  })

  it('drops a merged step that ends where it began', () => {
    let state = withFiles('a.ecore')
    state = edit(state, 'a.ecore', '<x/>', 'name', 0)
    state = edit(state, 'a.ecore', '<a.ecore/>', 'name', 100)
    expect(state.undo).toHaveLength(0)
  })

  it('forgets history for a closed file and clears redo on a new edit', () => {
    let state = withFiles('a.ecore', 'b.ecore')
    state = edit(state, 'a.ecore', '<a2/>')
    state = edit(state, 'b.ecore', '<b2/>')
    state = reduce(state, { type: 'remove', key: 'a.ecore' })
    expect(state.undo).toHaveLength(1)
    state = reduce(state, { type: 'undo' })
    expect(state.redo).toHaveLength(1)
    state = edit(state, 'b.ecore', '<b3/>')
    expect(state.redo).toHaveLength(0)
  })

  it('marks files saved', () => {
    let state = edit(withFiles('a.ecore'), 'a.ecore', '<a2/>')
    state = reduce(state, { type: 'markSaved', keys: ['a.ecore'] })
    expect(isDirty(state.files[0]!)).toBe(false)
  })

  it('keeps new, never-saved files dirty', () => {
    const state = reduce(EMPTY_WORKSPACE, { type: 'add', files: [{ name: 'n.ecore', text: '<n/>', savedText: null }] })
    expect(isDirty(state.files[0]!)).toBe(true)
  })

  it('finds a free name', () => {
    const state = withFiles('untitled.ecore', 'Untitled-2.ecore')
    expect(freeName(state.files, 'untitled')).toBe('untitled-3.ecore')
  })
})

describe('xml round trip', () => {
  it('keeps the declaration and the rest of the file', () => {
    const doc = parseXml(library)
    const text = serializeXml(doc, library)
    expect(text.startsWith('<?xml')).toBe(true)
    expect(parseModel(text, 'library.ecore', 0).classifiers.length).toBe(
      parseModel(library, 'library.ecore', 0).classifiers.length,
    )
  })

  it('writes a new model that parses', () => {
    const model = parseModel(newModelText('shop'), 'shop.ecore', 0)
    expect(model.roots[0]?.name).toBe('shop')
    expect(model.roots[0]?.nsURI).toBe('http://www.example.org/shop')
  })
})
