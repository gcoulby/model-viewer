// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { SAMPLES } from '@/data/samples'
import { buildGraph } from '../buildGraph'
import { parseModel } from '../parse'
import type { ClassGraphNode, FeatureGraphEdge } from '@/types/graph'

const sample = () => parseModel(SAMPLES[0]!.files[0]!.text, 'library.ecore', 0)

function byName(graph: ReturnType<typeof buildGraph>, name: string) {
  return [...graph.nodes.values()].find((n) => n.name === name)
}

describe('parseModel', () => {
  it('reads the sample classifiers', () => {
    const model = sample()
    expect(model.classifiers).toHaveLength(13)
    expect(model.classifiers.filter((c) => c.kind === 'class')).toHaveLength(11)
    expect(model.classifiers.filter((c) => c.kind === 'enum')).toHaveLength(2)
    const audit = model.classifiers.find((c) => c.name === 'AuditEntry')
    expect(audit?.path).toBe('//audit/AuditEntry')
    expect(model.packages.map((p) => p.fullName)).toEqual(['library', 'library.audit'])
  })

  it('reports invalid XML', () => {
    expect(() => parseModel('<a><b></a>', 'bad.ecore', 0)).toThrow(/^bad\.ecore: this is not valid XML\. /)
  })

  it('reports a file without an EPackage', () => {
    expect(() => parseModel('<root><x/></root>', 'none.ecore', 0)).toThrow(
      'none.ecore: no EPackage found, so this does not look like an Ecore file.',
    )
  })
})

describe('buildGraph', () => {
  const graph = buildGraph([sample()])

  it('links inheritance', () => {
    const item = byName(graph, 'Item') as ClassGraphNode
    expect(item.abstract).toBe(true)
    const borrowable = byName(graph, 'Borrowable')
    expect(item.superIds).toEqual([borrowable?.id])
    expect((borrowable as ClassGraphNode).interface).toBe(true)
    for (const name of ['Book', 'Magazine', 'Dvd']) {
      expect((byName(graph, name) as ClassGraphNode).superIds).toEqual([item.id])
    }
  })

  it('merges opposite references', () => {
    const featureEdges = graph.edges.filter((e): e is FeatureGraphEdge => e.kind !== 'inherit')
    const containment = featureEdges.filter((e) => e.kind === 'containment' && e.forward.feature.name === 'items')
    expect(containment).toHaveLength(1)
    expect((containment[0]?.back?.feature.name)).toBe('library')
    expect(featureEdges.filter((e) => e.forward.feature.name === 'library')).toHaveLength(0)

    const authors = featureEdges.filter(
      (e) => e.forward.feature.name === 'authors' || e.forward.feature.name === 'books',
    )
    expect(authors).toHaveLength(1)
    expect(authors[0]?.kind).toBe('reference')
    expect(authors[0]?.back).not.toBeNull()
  })

  it('creates enum links and ghost nodes', () => {
    const enumLinks = graph.edges.filter((e) => e.kind === 'enumLink') as FeatureGraphEdge[]
    const names = enumLinks.map((e) => e.forward.feature.name).sort()
    expect(names).toEqual(['genre', 'tier'])
    const ghost = byName(graph, 'EObject')
    expect(ghost?.kind).toBe('external')
    expect(ghost && 'source' in ghost && ghost.source).toBe('Ecore (built in)')
  })

  it('resolves references across files', () => {
    const a = parseModel(
      `<ecore:EPackage xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" name="a" nsURI="http://a">
         <eClassifiers xsi:type="ecore:EClass" name="Base"/>
       </ecore:EPackage>`,
      'a.ecore',
      0,
    )
    const b = parseModel(
      `<ecore:EPackage xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" name="b" nsURI="http://b">
         <eClassifiers xsi:type="ecore:EClass" name="Derived" eSuperTypes="a.ecore#//Base"/>
         <eClassifiers xsi:type="ecore:EClass" name="Other" eSuperTypes="http://a#//Base"/>
         <eClassifiers xsi:type="ecore:EClass" name="Lost" eSuperTypes="missing.ecore#//Gone"/>
       </ecore:EPackage>`,
      'b.ecore',
      1,
    )
    const combined = buildGraph([a, b])
    const base = byName(combined, 'Base')
    expect((byName(combined, 'Derived') as ClassGraphNode).superIds).toEqual([base?.id])
    expect((byName(combined, 'Other') as ClassGraphNode).superIds).toEqual([base?.id])
    const lost = (byName(combined, 'Lost') as ClassGraphNode).superIds[0]
    expect(combined.nodes.get(lost ?? '')?.kind).toBe('external')
  })
})
