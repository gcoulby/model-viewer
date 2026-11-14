// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { SAMPLES } from '@/data/samples'
import { parseXml } from '@/lib/workspace/xml'
import { validate } from '../validate'
import type { RefFile } from '../refs'

function check(files: { name: string; text: string }[]) {
  const refFiles: RefFile[] = files.map((f, index) => ({ key: f.name.toLowerCase(), name: f.name, index, text: f.text }))
  const docs = new Map(refFiles.map((f) => [f.key, parseXml(f.text) as Document]))
  return validate(refFiles, docs)
}

describe('validate on the samples', () => {
  for (const sample of SAMPLES) {
    it(`finds no errors in ${sample.label}`, () => {
      const problems = check(sample.files)
      expect(problems).toEqual([])
    })
  }
})

const library = SAMPLES.find((s) => s.id === 'library')!.files[0]!.text
const shop = SAMPLES.find((s) => s.id === 'shop')!.files

/** The library sample with one substitution made, checked on its own. */
const codesAfter = (from: string | RegExp, to: string) =>
  check([{ name: 'library.ecore', text: library.replace(from, to) }]).map((p) => `${p.code}: ${p.message}`)

describe('validate finds', () => {
  it('a type that no longer exists', () => {
    expect(codesAfter('eType="#//Tier"', 'eType="#//Rank"')).toContain("UnresolvedProxy: Type Rank doesn't exist")
  })

  it('a missing type, and the wrong kind of type', () => {
    expect(codesAfter(/ eType="ecore:EDataType http:\/\/www.eclipse.org\/emf\/2002\/Ecore#\/\/EInt"/, '')).toContain('ValidType: No type is set')
    expect(codesAfter('eType="#//Tier"', 'eType="#//Book"')).toContain(
      "ConsistentType: An attribute's type must be a data type or enum, not the class Book",
    )
  })

  it('bad and clashing names', () => {
    expect(codesAfter('name="Magazine"', 'name="Maga zine"')).toContain(
      "WellFormedName: Maga zine isn't a valid name: use letters, digits and _ only, not starting with a digit",
    )
    expect(codesAfter('name="Magazine"', 'name="Book"').filter((c) => c.startsWith('UniqueNames'))).toHaveLength(2)
  })

  it('opposites that do not agree', () => {
    expect(codesAfter('eOpposite="#//Item/library"', 'eOpposite="#//Library/people"').some((c) => c.startsWith('ConsistentOpposite'))).toBe(true)
  })

  it('supertype cycles and interfaces that are not abstract', () => {
    const codes = codesAfter('name="Borrowable" abstract="true" interface="true"', 'name="Borrowable" interface="true" eSuperTypes="#//Item"')
    expect(codes).toContain('InterfaceIsAbstract: An interface must also be abstract')
    expect(codes.filter((c) => c.startsWith('NoCircularSuperTypes'))).toHaveLength(2)
  })

  it('bounds that do not fit', () => {
    expect(codesAfter('name="copies" lowerBound="1"', 'name="copies" lowerBound="3" upperBound="2"')).toContain(
      'ConsistentBounds: The lower bound (3) is more than the upper bound (2)',
    )
  })

  it('a reference to a file that is not open, as a warning', () => {
    const problems = check([shop.find((f) => f.name.endsWith('orders.ecore'))!])
    expect(problems.length).toBeGreaterThan(0)
    expect(problems.every((p) => p.severity === 'warning' && p.message.includes("isn't open"))).toBe(true)
  })
})
