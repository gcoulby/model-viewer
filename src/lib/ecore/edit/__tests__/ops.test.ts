// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { SAMPLES } from '@/data/samples'
import { parseModel } from '@/lib/ecore/parse'
import { parseXml, serializeXml } from '@/lib/workspace/xml'
import { elementAt, pathOf, type ElementRef } from '../dom'
import { NEW_CHILDREN, kindOf, newChildrenOf, type NewChildSpec } from '../kinds'
import { rowLabel, typeLabel } from '../labels'
import {
  createChild,
  duplicate,
  move,
  remove,
  setAttribute,
  setMultiplicity,
  setOpposite,
  setRefList,
  setType,
  shift,
  type EditDocs,
} from '../ops'
import { elementForFragment, fragmentOf, graphIdOf, relativePath, type RefFile } from '../refs'

const sample = (id: string) => SAMPLES.find((s) => s.id === id)!.files

/** A workspace of files whose documents are parsed on demand and written back by `texts()`. */
function workspace(files: { name: string; text: string }[]) {
  const refFiles: RefFile[] = files.map((f, index) => ({ key: f.name.toLowerCase(), name: f.name, index, text: f.text }))
  const docs = new Map<string, Document>()
  const d: EditDocs = {
    files: refFiles,
    doc: (key) => {
      if (!docs.has(key)) {
        const file = refFiles.find((f) => f.key === key)
        if (!file) return null
        docs.set(key, parseXml(file.text))
      }
      return docs.get(key)!
    },
  }
  const text = (key: string) => {
    const file = refFiles.find((f) => f.key === key)!
    return docs.has(key) ? serializeXml(docs.get(key) as XMLDocument, file.text) : file.text
  }
  const find = (key: string, fragment: string): ElementRef => {
    const el = elementForFragment(d.doc(key)!, fragment)
    if (!el) throw new Error(`no ${fragment}`)
    return { key, path: pathOf(el) }
  }
  const el = (ref: ElementRef) => elementAt(d.doc(ref.key)!, ref.path)!
  return { d, text, find, el }
}

const spec = (kind: keyof typeof NEW_CHILDREN, label: string): NewChildSpec =>
  NEW_CHILDREN[kind].find((s) => s.label === label)!

describe('fragments and ids', () => {
  it('match the paths the parser gives', () => {
    const w = workspace(sample('library'))
    const book = w.find('library.ecore', '//Book')
    expect(graphIdOf(0, w.el(book))).toBe('0|//Book')
    const model = parseModel(sample('library')[0]!.text, 'library.ecore', 0)
    expect(model.classifiers.some((c) => c.id === '0|//Book')).toBe(true)
    expect(fragmentOf(w.el(w.find('library.ecore', '//Item/title')))).toBe('//Item/title')
  })

  it('tells same-named classifiers apart, as the parser does', () => {
    const text = sample('library')[0]!.text.replace('name="Magazine"', 'name="Book"')
    const model = parseModel(text, 'library.ecore', 0)
    const ids = model.classifiers.filter((c) => c.name === 'Book').map((c) => c.id)
    expect(new Set(ids).size).toBe(2)
    const w = workspace([{ name: 'library.ecore', text }])
    const books = Array.from(w.d.doc('library.ecore')!.documentElement.children).filter((c) => c.getAttribute('name') === 'Book')
    expect(books.map((b) => graphIdOf(0, b)).sort()).toEqual([...ids].sort())
  })

  it('builds relative paths', () => {
    expect(relativePath('', 'core.ecore')).toBe('core.ecore')
    expect(relativePath('a/b', 'a/c/x.ecore')).toBe('../c/x.ecore')
    expect(relativePath('a', 'a/x.ecore')).toBe('x.ecore')
  })
})

describe('creating', () => {
  it('adds a class in Eclipse order and indentation, and it parses', () => {
    const w = workspace(sample('library'))
    const created = createChild(w.d, { key: 'library.ecore', path: [] }, spec('EPackage', 'Class'))
    const text = w.text('library.ecore')
    expect(text).toContain('\n  <eClassifiers xsi:type="ecore:EClass" name="NewClass"/>\n')
    const model = parseModel(text, 'library.ecore', 0)
    expect(model.classifiers.some((c) => c.name === 'NewClass')).toBe(true)
    expect(kindOf(w.el(created))).toBe('EClass')
  })

  it('names new things uniquely and gives attributes a type', () => {
    const w = workspace(sample('library'))
    const book = w.find('library.ecore', '//Book')
    const a = createChild(w.d, book, spec('EClass', 'Attribute'))
    const b = createChild(w.d, book, spec('EClass', 'Attribute'))
    expect(w.el(a).getAttribute('name')).toBe('attribute')
    expect(w.el(b).getAttribute('name')).toBe('attribute2')
    expect(typeLabel(w.el(a))).toBe('EString')
  })

  it('fills a self-closing element with properly indented children', () => {
    const w = workspace(sample('library'))
    const created = createChild(w.d, { key: 'library.ecore', path: [] }, spec('EPackage', 'Class'))
    createChild(w.d, created, spec('EClass', 'Operation'))
    expect(w.text('library.ecore')).toMatch(/name="NewClass">\n {4}<eOperations name="operation"\/>\n {2}<\/eClassifiers>/)
  })

  it('numbers enum literals on from the last value', () => {
    const w = workspace(sample('library'))
    const genre = w.find('library.ecore', '//Genre')
    const lit = createChild(w.d, genre, spec('EEnum', 'Literal'))
    expect(Number(w.el(lit).getAttribute('value'))).toBeGreaterThan(0)
  })

  it('moves a type into a new generic type and offers it only once', () => {
    const w = workspace(sample('library'))
    const title = w.find('library.ecore', '//Item/title')
    createChild(w.d, title, spec('EAttribute', 'Generic type'))
    expect(w.el(title).hasAttribute('eType')).toBe(false)
    expect(typeLabel(w.el(title))).toBe('EString')
    expect(newChildrenOf(w.el(title)).some((s) => s.label === 'Generic type')).toBe(false)
  })
})

describe('refactoring', () => {
  it('renaming a class rewrites references to it and to its features', () => {
    const w = workspace(sample('library'))
    const item = w.find('library.ecore', '//Item')
    setAttribute(w.d, item, 'name', 'Holding')
    const text = w.text('library.ecore')
    expect(text).not.toContain('#//Item"')
    expect(text).toContain('eType="#//Holding"')
    expect(text).toContain('eOpposite="#//Holding/library"')
    expect(text).toContain('eSuperTypes="#//Holding"')
    const model = parseModel(text, 'library.ecore', 0)
    expect(model.classifiers.find((c) => c.name === 'Book')?.kind === 'class' && model.classifiers.find((c) => c.name === 'Book')).toBeTruthy()
  })

  it('renaming a class rewrites references from other files', () => {
    const w = workspace(sample('shop'))
    const entity = w.find('core.ecore', '//Entity')
    setAttribute(w.d, entity, 'name', 'Thing')
    expect(w.text('orders.ecore')).toContain('eSuperTypes="core.ecore#//Thing"')
    expect(w.text('orders.ecore')).not.toContain('#//Entity')
  })

  it('deleting a class drops it from supertypes and opposites but leaves types dangling', () => {
    const w = workspace(sample('library'))
    remove(w.d, w.find('library.ecore', '//Borrowable'))
    const text = w.text('library.ecore')
    expect(text).not.toContain('Borrowable')
    expect(text).not.toContain('eSuperTypes=""')
  })

  it('deleting a reference clears its opposite', () => {
    const w = workspace(sample('shop'))
    remove(w.d, w.find('orders.ecore', '//Order/customer'))
    expect(w.text('orders.ecore')).not.toContain('eOpposite')
  })

  it('moving a class to a subpackage rewrites references', () => {
    const w = workspace(sample('library'))
    const sub = createChild(w.d, { key: 'library.ecore', path: [] }, spec('EPackage', 'Subpackage'))
    const tier = w.find('library.ecore', '//Tier')
    const moved = move(w.d, tier, sub, null)
    expect(fragmentOf(w.el(moved))).toBe('//subpackage/Tier')
    expect(w.text('library.ecore')).toContain('eType="#//subpackage/Tier"')
  })

  it('shifts a feature among its siblings', () => {
    const w = workspace(sample('library'))
    const year = w.find('library.ecore', '//Item/year')
    const up = shift(w.d, year, -1)
    expect(w.el(up).previousElementSibling?.getAttribute('name')).toBe('id')
  })

  it('duplicates with a fresh name and no shared opposite', () => {
    const w = workspace(sample('library'))
    const copy = duplicate(w.d, w.find('library.ecore', '//Library/items'))
    expect(w.el(copy).getAttribute('name')).toBe('items1')
    expect(w.el(copy).hasAttribute('eOpposite')).toBe(false)
  })
})

describe('setting values', () => {
  it('sets built-in, cross-file and type-parameter types', () => {
    const w = workspace(sample('shop'))
    const currency = w.find('orders.ecore', '//Order/currency')
    setType(w.d, currency, { kind: 'builtin', name: 'EInt', eKind: 'EDataType' })
    expect(w.el(currency).getAttribute('eType')).toBe('ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EInt')
    setType(w.d, currency, { kind: 'element', fileKey: 'core.ecore', fragment: '//Currency', eKind: 'EEnum' })
    expect(w.el(currency).getAttribute('eType')).toBe('ecore:EEnum core.ecore#//Currency')
    setType(w.d, currency, { kind: 'typeParameter', fragment: '//Order/T' })
    expect(w.el(currency).hasAttribute('eType')).toBe(false)
    expect(typeLabel(w.el(currency))).toBe('T')
  })

  it('writes multiplicity without defaults', () => {
    const w = workspace(sample('library'))
    const year = w.find('library.ecore', '//Item/year')
    setMultiplicity(w.d, year, 1, -1)
    expect(rowLabel(w.el(year)).detail).toBe(': EInt [1..*]')
    setMultiplicity(w.d, year, 0, 1)
    expect(w.el(year).hasAttribute('lowerBound') || w.el(year).hasAttribute('upperBound')).toBe(false)
  })

  it('pairs opposites both ways and releases old partners', () => {
    const w = workspace(sample('shop'))
    const orders = w.find('orders.ecore', '//Customer/orders')
    const lines = w.find('orders.ecore', '//Order/lines')
    setOpposite(w.d, lines, { fileKey: 'orders.ecore', fragment: '//Customer/orders' })
    expect(w.el(lines).getAttribute('eOpposite')).toBe('#//Customer/orders')
    expect(w.el(orders).getAttribute('eOpposite')).toBe('#//Order/lines')
    expect(w.el(w.find('orders.ecore', '//Order/customer')).hasAttribute('eOpposite')).toBe(false)
    setOpposite(w.d, lines, null)
    expect(w.el(orders).hasAttribute('eOpposite')).toBe(false)
  })

  it('writes supertypes across files without a type prefix', () => {
    const w = workspace(sample('shop'))
    const line = w.find('orders.ecore', '//OrderLine')
    setRefList(w.d, line, 'eSuperTypes', [{ kind: 'element', fileKey: 'core.ecore', fragment: '//Entity', eKind: 'EClass' }], false)
    expect(w.el(line).getAttribute('eSuperTypes')).toBe('core.ecore#//Entity')
  })
})
