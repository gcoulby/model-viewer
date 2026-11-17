// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { SAMPLES } from '@/data/samples'
import { readDetails, setConstraint } from '@/lib/constraints'
import { elementForPath } from '@/lib/ecore/edit/refs'
import { parseModel } from '@/lib/ecore/parse'
import { validate } from '@/lib/ecore/edit/validate'
import { parseXml, serializeXml } from '@/lib/workspace/xml'
import { generateInstance, random } from '../generate'
import { buildMetamodel } from '../metamodel'
import { sampleRegex } from '../sampleRegex'
import { validateInstances } from '../validateInstance'

const library = SAMPLES.find((s) => s.id === 'library')!.files[0]!

/** The Library sample with some constraints written on its features. */
function constrained(entries: [string, string, string][]) {
  const doc = parseXml(library.text)
  for (const [path, key, value] of entries) setConstraint(elementForPath(doc, path)!, key as never, value)
  return serializeXml(doc, library.text)
}

const metaOf = (text: string) => buildMetamodel([parseModel(text, library.name, 0)])
const files = (text: string) => [{ key: 'gen.xmi', name: 'gen.xmi', index: 1, doc: parseXml(text) }]

describe('constraints', () => {
  it('are written as an annotation on the feature and read back', () => {
    const text = constrained([['//Item/year', 'min', '1900'], ['//Item/year', 'max', '2025']])
    expect(text).toContain('<eAnnotations source="http://ecore-studio/constraints">')
    const year = elementForPath(parseXml(text), '//Item/year')!
    expect(readDetails(year)).toEqual({ min: '1900', max: '2025' })
    setConstraint(year, 'min', null)
    setConstraint(year, 'max', '')
    expect(year.querySelector('eAnnotations')).toBeNull()
  })

  it('reports bad entries in the metamodel', () => {
    const text = constrained([['//Item/year', 'min', '2030'], ['//Item/year', 'max', '2000'], ['//Book/isbn', 'pattern', '[a-']])
    const doc = parseXml(text)
    const problems = validate([{ key: 'library.ecore', name: 'library.ecore', index: 0 }] as never, new Map([['library.ecore', doc]])).filter((p) => p.code === 'Constraint')
    expect(problems.map((p) => p.message).sort()).toEqual(['Pattern: not a valid regular expression', 'The minimum is above the maximum'])
  })
})

describe('sampleRegex', () => {
  it('makes strings that match common patterns', () => {
    const rng = random(7)
    for (const source of ['\\d{3}-\\d{10}', '[A-Z]{2}[0-9]{4}', '(red|green|blue)-[a-f0-9]+', 'ISBN ?\\d{1,5}']) {
      const sample = sampleRegex(source, rng)
      expect(sample).not.toBeNull()
      expect(new RegExp(`^(?:${source})$`).test(sample!)).toBe(true)
    }
    expect(sampleRegex('(a)\\1', rng)).toBeNull()
  })
})

describe('generateInstance', () => {
  it('makes a valid model from the root down, the same for the same seed', () => {
    const meta = metaOf(library.text)
    const root = [...meta.classes.values()].find((c) => c.name === 'Library')!
    const a = generateInstance(meta, { root, size: 'small', optional: true, seed: 42 })
    const b = generateInstance(meta, { root, size: 'small', optional: true, seed: 42 })
    expect(a.text).toBe(b.text)
    expect(a.objects).toBeGreaterThan(3)
    const errors = validateInstances(meta, files(a.text)).filter((p) => p.severity === 'error')
    expect(errors).toEqual([])
  })

  it('follows constraints, and validation catches values that break them', () => {
    const text = constrained([
      ['//Item/year', 'min', '1990'],
      ['//Item/year', 'max', '1999'],
      ['//Book/isbn', 'pattern', '\\d{3}-\\d{10}'],
      ['//Library/items', 'minCount', '3'],
    ])
    const meta = metaOf(text)
    const root = [...meta.classes.values()].find((c) => c.name === 'Library')!
    for (const seed of [1, 2, 3]) {
      const out = generateInstance(meta, { root, size: 'medium', optional: true, seed })
      const doc = parseXml(out.text)
      expect(doc.documentElement.querySelectorAll(':scope > items').length).toBeGreaterThanOrEqual(3)
      for (const year of Array.from(doc.querySelectorAll('items[year]'), (e) => Number(e.getAttribute('year')))) {
        expect(year).toBeGreaterThanOrEqual(1990)
        expect(year).toBeLessThanOrEqual(1999)
      }
      expect(validateInstances(meta, files(out.text)).filter((p) => p.severity === 'error')).toEqual([])
    }
    const broken = parseXml(generateInstance(meta, { root, size: 'small', optional: true, seed: 5 }).text)
    broken.querySelector('items')!.setAttribute('year', '2020')
    const problems = validateInstances(meta, [{ key: 'x', name: 'x', index: 1, doc: broken }])
    expect(problems.some((p) => p.code === 'Constraint' && p.message.includes('at most 1999'))).toBe(true)
  })

  it('makes only what is required when optional features are left out', () => {
    const meta = metaOf(library.text)
    const root = [...meta.classes.values()].find((c) => c.name === 'Library')!
    const out = generateInstance(meta, { root, size: 'large', optional: false, seed: 9 })
    expect(out.objects).toBeLessThan(5)
  })
})
