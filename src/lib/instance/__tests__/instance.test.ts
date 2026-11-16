// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { SAMPLES } from '@/data/samples'
import { elementAt, type ElementRef } from '@/lib/ecore/edit/dom'
import { parseModel } from '@/lib/ecore/parse'
import { parseXml, serializeXml } from '@/lib/workspace/xml'
import { buildMetamodel, concreteFamily, type Metamodel } from '../metamodel'
import { buildObjectGraph } from '../objectGraph'
import { validateInstances } from '../validateInstance'
import {
  classOf,
  createObject,
  createObjectAnywhere,
  createRootObject,
  rootObjects,
  duplicateObject,
  fragmentOf,
  isInstanceDoc,
  labelOf,
  newInstanceText,
  objectByFragment,
  removeObject,
  setReferences,
  setValue,
  setValues,
  shiftObject,
} from '../xmi'

const library = SAMPLES.find((s) => s.id === 'library')!.files[0]!
const meta: Metamodel = buildMetamodel([parseModel(library.text, library.name, 0)])
const cls = (name: string) => [...meta.classes.values()].find((c) => c.name === name)!

function instance() {
  let doc = parseXml(newInstanceText(cls('Library'), 'library.ecore'))
  const d = { doc: () => doc }
  const el = (ref: ElementRef) => elementAt(doc, ref.path)!
  const text = () => serializeXml(doc as XMLDocument, '<?xml version="1.0" encoding="UTF-8"?>\n')
  const reload = () => {
    doc = parseXml(text())
  }
  const root: ElementRef = { key: 'lib.xmi', path: [] }
  return { d, el, text, reload, root, files: () => [{ key: 'lib.xmi', name: 'lib.xmi', index: 1, doc }] }
}

const feature = (className: string, name: string) => cls(className).features.find((f) => f.name === name)!

describe('metamodel', () => {
  it('lists inherited features first and finds the roots', () => {
    expect(cls('Book').features.map((f) => f.name)).toEqual(['id', 'title', 'year', 'copies', 'library', 'isbn', 'pages', 'genre', 'authors'])
    expect(meta.roots.map((c) => c.name)).toContain('Library')
    expect(concreteFamily(meta, cls('Item').id).map((c) => c.name).sort()).toEqual(['Book', 'Dvd', 'Magazine'])
  })
})

describe('instances', () => {
  it('starts as one root object linked to its metamodel', () => {
    const w = instance()
    expect(isInstanceDoc(w.d.doc())).toBe(true)
    expect(classOf(meta, w.el(w.root))?.name).toBe('Library')
    expect(w.text()).toContain('xsi:schemaLocation="http://example.org/library/1.0 library.ecore"')
  })

  it('creates contained objects with xsi:type for subclasses, in feature order', () => {
    const w = instance()
    const book = createObject(w.d, meta, w.root, 'items', cls('Book'))
    const person = createObject(w.d, meta, w.root, 'people', cls('Author'))
    const text = w.text()
    expect(text).toMatch(/<items xsi:type="\w+:Book"/)
    expect(text.indexOf('<items')).toBeLessThan(text.indexOf('<people'))
    expect(fragmentOf(meta, w.el(book))).toBe('//@items.0')
    expect(fragmentOf(meta, w.el(person))).toBe('//@people.0')
    expect(labelOf(meta, w.el(person))).toEqual({ name: 'author1', className: 'Author' })
  })

  it('writes values and references as EMF does, and survives a round trip', () => {
    const w = instance()
    const book = createObject(w.d, meta, w.root, 'items', cls('Book'))
    const author = createObject(w.d, meta, w.root, 'people', cls('Author'))
    setValue(w.d, book, feature('Book', 'title'), 'Dune')
    setValue(w.d, book, feature('Book', 'genre'), 'FICTION')
    setReferences(w.d, meta, book, feature('Book', 'authors'), [author])
    expect(w.el(book).getAttribute('authors')).toBe('//@people.0')
    w.reload()
    const again = objectByFragment(meta, w.d.doc(), '//@items.0')!
    expect(again.getAttribute('title')).toBe('Dune')
    expect(objectByFragment(meta, w.d.doc(), again.getAttribute('authors')!)?.getAttribute('name')).toBe('author1')
  })

  it('follows references when objects are deleted or reordered', () => {
    const w = instance()
    const book = createObject(w.d, meta, w.root, 'items', cls('Book'))
    const a1 = createObject(w.d, meta, w.root, 'people', cls('Author'))
    const a2 = createObject(w.d, meta, w.root, 'people', cls('Author'))
    setReferences(w.d, meta, book, feature('Book', 'authors'), [a1, a2])
    const first = w.el(a1)
    shiftObject(w.d, meta, a2, -1)
    expect(w.el(book).getAttribute('authors')).toBe('//@people.1 //@people.0')
    removeObject(w.d, meta, { key: 'lib.xmi', path: [Array.prototype.indexOf.call(first.parentElement!.children, first)] })
    expect(w.el(book).getAttribute('authors')).toBe('//@people.0')
  })

  it('stores many-valued attributes as elements', () => {
    const w = instance()
    const book = createObject(w.d, meta, w.root, 'items', cls('Book'))
    const tags = { ...feature('Book', 'title'), many: true, name: 'tags' }
    setValues(w.d, meta, book, tags, ['a', 'b'])
    expect(w.text()).toContain('<tags>a</tags>')
  })

  it('duplicates without copying IDs', () => {
    const w = instance()
    const book = createObject(w.d, meta, w.root, 'items', cls('Book'))
    setValue(w.d, book, feature('Book', 'id'), 'b1')
    const copy = duplicateObject(w.d, meta, book)
    expect(w.el(copy).hasAttribute('id')).toBe(false)
  })

  it('draws objects and links', () => {
    const w = instance()
    const book = createObject(w.d, meta, w.root, 'items', cls('Book'))
    const author = createObject(w.d, meta, w.root, 'people', cls('Author'))
    setValue(w.d, book, feature('Book', 'title'), 'Dune')
    setReferences(w.d, meta, book, feature('Book', 'authors'), [author])
    const graph = buildObjectGraph(meta, w.files())
    const bookNode = [...graph.nodes.values()].find((n) => n.name.endsWith(': Book'))
    expect(bookNode?.kind === 'class' && bookNode.object?.slots).toContain('title = "Dune"')
    expect(graph.edges.filter((e) => e.kind === 'containment')).toHaveLength(2)
    expect(graph.edges.filter((e) => e.kind === 'reference')).toHaveLength(1)
  })

  it('reports what EMF would', () => {
    const w = instance()
    const book = createObject(w.d, meta, w.root, 'items', cls('Book'))
    setValue(w.d, book, feature('Book', 'pages'), 'many')
    setValue(w.d, book, feature('Book', 'genre'), 'POETRYY')
    w.el(book).setAttribute('authors', '//@people.7')
    const messages = validateInstances(meta, w.files()).map((p) => p.message)
    expect(messages).toContain('pages must be a whole number, not "many"')
    expect(messages.some((m) => m.startsWith('genre must be one of'))).toBe(true)
    expect(messages).toContain("authors points at //@people.7, which doesn't exist")
    expect(messages).toContain('id is required')
  })

  it('holds more roots in an xmi:XMI wrapper, following references through the wrap and back', () => {
    const w = instance()
    const book = createObject(w.d, meta, w.root, 'items', cls('Book'))
    const author = createObjectAnywhere(w.d, meta, 'lib.xmi', cls('Author'))
    expect(w.el(author).localName).toBe('people')
    setReferences(w.d, meta, book, feature('Book', 'authors'), [author])
    expect(w.el(book).getAttribute('authors')).toBe('//@people.0')

    const entry = createRootObject(w.d, meta, 'lib.xmi', cls('AuditEntry'))
    expect(entry.path).toEqual([1])
    expect(w.text()).toMatch(/<xmi:XMI [^>]*xmlns:lib="http:\/\/example.org\/library\/1.0"/)
    expect(w.el({ key: 'lib.xmi', path: [0, 0] }).getAttribute('authors')).toBe('/0/@people.0')

    w.reload()
    expect(rootObjects(w.d.doc()).map((r) => classOf(meta, r)?.name)).toEqual(['Library', 'AuditEntry'])
    expect(validateInstances(meta, w.files()).filter((p) => p.code.includes('reference'))).toEqual([])

    removeObject(w.d, meta, { key: 'lib.xmi', path: [1] })
    expect(w.text()).not.toContain('xmi:XMI')
    expect(w.text()).toContain('xsi:schemaLocation="http://example.org/library/1.0 library.ecore')
    expect(w.el({ key: 'lib.xmi', path: [0] }).getAttribute('authors')).toBe('//@people.0')
    expect(() => removeObject(w.d, meta, w.root)).toThrow()
  })

  it('puts an object nothing in the file can hold in a new root', () => {
    const w = instance()
    const entry = createObjectAnywhere(w.d, meta, 'lib.xmi', cls('AuditEntry'))
    expect(rootObjects(w.d.doc())).toHaveLength(2)
    expect(classOf(meta, w.el(entry))?.name).toBe('AuditEntry')
    expect(w.text()).toMatch(/xsi:schemaLocation="http:\/\/example.org\/library\/1.0 library.ecore http:\/\/example.org\/library\/audit\/1.0 library.ecore#\/\/\w+"/)
  })
})
