// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { SAMPLES } from '@/data/samples'
import { parseModel } from '@/lib/ecore/parse'
import { buildMetamodel } from '@/lib/instance/metamodel'
import { analyze } from '../analyze'
import { reportHtml, reportMarkdown } from '../report'

const report = (text: string) => {
  const models = [parseModel(text, 'm.ecore', 0)]
  return analyze(buildMetamodel(models), models, [])
}

const ECORE = (classes: string) => `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="m" nsURI="http://m" nsPrefix="m">${classes}
</ecore:EPackage>`

describe('analyze', () => {
  it('measures the Library sample', () => {
    const library = SAMPLES.find((s) => s.id === 'library')!.files[0]!
    const r = report(library.text)
    expect(r.summary.classes).toBeGreaterThan(5)
    expect(r.containment.roots).toContain('Library')
    const book = r.classes.find((c) => c.name === 'Book')!
    expect(book.dit).toBe(r.classes.find((c) => c.name === 'Item')!.dit + 1)
    expect(book.inherited).toBeGreaterThan(0)
    expect(r.classes.find((c) => c.name === 'Item')!.noc).toBe(3)
    expect(reportMarkdown(r)).toContain('| Book |')
    expect(reportHtml(r)).toContain('<h1>Metamodel analysis</h1>')
  })

  it("finds classes that can't be instantiated, unused types and abstract leaves", () => {
    const r = report(
      ECORE(`
  <eClassifiers xsi:type="ecore:EClass" name="Root">
    <eStructuralFeatures xsi:type="ecore:EReference" name="a" lowerBound="1" eType="#//A" containment="true"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="A">
    <eStructuralFeatures xsi:type="ecore:EReference" name="b" lowerBound="1" eType="#//B" containment="true"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="B">
    <eStructuralFeatures xsi:type="ecore:EReference" name="a" lowerBound="1" eType="#//A" containment="true"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="Shape" abstract="true"/>
  <eClassifiers xsi:type="ecore:EEnum" name="Colour"><eLiterals name="RED"/></eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="bad_name"/>`),
    )
    const items = (id: string) => r.findings.find((f) => f.id === id)?.items.map((i) => i.label).sort() ?? []
    expect(items('infinite')).toEqual(['A', 'B', 'Root'])
    expect(items('abstract-leaf')).toEqual(['Shape'])
    expect(items('unused-types')).toEqual(['Colour'])
    expect(items('naming')).toEqual(['bad_name'])
    expect(r.containment.recursive.sort()).toEqual(['A', 'B'])
  })
})
