// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { VIEW_OPTIONS } from '@/data/viewOptions'
import { loadSampleText } from '@/data/loadSample'
import type { ClassGraphNode, GraphNode } from '@/types/graph'
import type { NodeGeometry, ViewOptions } from '@/types/view'
import { buildGraph } from '../buildGraph'
import { attributeRow, capRows, multiplicitySuffix, operationRow, referenceRow } from '../format'
import { layoutNodes } from '../layout'
import { computeGeometry, createTextMeasurer } from '../measure'
import { parseModel } from '../parse'
import { computeVisible } from '../visibleGraph'

const options = (overrides: Partial<ViewOptions> = {}): ViewOptions => ({
  ...(Object.fromEntries(VIEW_OPTIONS.map((o) => [o.key, o.defaultValue])) as Omit<ViewOptions, 'direction'>),
  direction: 'TB',
  ...overrides,
})

const graph = buildGraph([parseModel(loadSampleText(), 'library.ecore', 0)])
const measure = createTextMeasurer()
const find = (name: string) => [...graph.nodes.values()].find((n) => n.name === name) as GraphNode

function geometryFor(opts: ViewOptions) {
  const visible = computeVisible(graph, opts)
  const geometry = new Map<string, NodeGeometry>()
  for (const n of visible.nodes) geometry.set(n.id, computeGeometry(n, opts, false, measure))
  return { visible, geometry }
}

describe('format', () => {
  it('formats multiplicity', () => {
    expect(multiplicitySuffix({ lower: 0, upper: 1 })).toBe('')
    expect(multiplicitySuffix({ lower: 0, upper: -1 })).toBe(' [*]')
    expect(multiplicitySuffix({ lower: 2, upper: 2 })).toBe(' [2]')
    expect(multiplicitySuffix({ lower: 1, upper: -1 })).toBe(' [1..*]')
  })

  it('formats sample rows', () => {
    const item = find('Item') as ClassGraphNode
    expect(item.attributes.map(attributeRow)).toEqual([
      'id: EString [1] {id}',
      'title: EString [1]',
      'year: EInt',
      'copies: EInt [1] = 1',
    ])
    const loan = find('Loan') as ClassGraphNode
    expect(attributeRow(loan.attributes[2]!)).toBe('/overdue: EBoolean')
    const library = find('Library') as ClassGraphNode
    expect(referenceRow(library.references[0]!)).toBe('items: Item [*] {containment}  opposite: library')
    expect(operationRow(library.operations[0]!)).toBe('findByTitle(title: EString): Item [*]')
  })

  it('caps long compartments', () => {
    const rows = Array.from({ length: 30 }, (_, i) => `r${i}`)
    const capped = capRows(rows)
    expect(capped).toHaveLength(25)
    expect(capped[24]).toBe('… 6 more')
  })
})

describe('geometry and layout', () => {
  it('keeps widths within bounds', () => {
    const { geometry } = geometryFor(options({ operations: true }))
    for (const geo of geometry.values()) {
      expect(geo.width).toBeGreaterThanOrEqual(132)
      expect(geo.width).toBeLessThanOrEqual(430)
    }
  })

  it('places every visible node at a finite position', () => {
    const { visible, geometry } = geometryFor(options())
    const positions = layoutNodes(visible.nodes, visible.edges, geometry, 'TB')
    for (const n of visible.nodes) {
      const p = positions.get(n.id)
      expect(Number.isFinite(p?.x)).toBe(true)
      expect(Number.isFinite(p?.y)).toBe(true)
    }
  })

  it('puts isolated nodes below the connected graph', () => {
    const text = `<ecore:EPackage xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" name="p" nsURI="http://p">
      <eClassifiers xsi:type="ecore:EClass" name="Base"/>
      <eClassifiers xsi:type="ecore:EClass" name="Child" eSuperTypes="#//Base"/>
      <eClassifiers xsi:type="ecore:EClass" name="Lonely"/>
      <eClassifiers xsi:type="ecore:EEnum" name="Unused"/>
    </ecore:EPackage>`
    const small = buildGraph([parseModel(text, 'p.ecore', 0)])
    const opts = options()
    const visible = computeVisible(small, opts)
    const geometry = new Map<string, NodeGeometry>()
    for (const n of visible.nodes) geometry.set(n.id, computeGeometry(n, opts, false, measure))
    const positions = layoutNodes(visible.nodes, visible.edges, geometry, 'TB')
    const named = (name: string) => visible.nodes.find((n) => n.name === name)!
    const bottom = Math.max(
      ...['Base', 'Child'].map((name) => positions.get(named(name).id)!.y + geometry.get(named(name).id)!.height),
    )
    expect(positions.get(named('Lonely').id)!.y).toBeGreaterThan(bottom)
    expect(positions.get(named('Unused').id)!.y).toBeGreaterThan(bottom)
  })

  it('changes the main axis with the direction', () => {
    const { visible, geometry } = geometryFor(options())
    const spread = (dir: 'TB' | 'LR') => {
      const positions = layoutNodes(visible.nodes, visible.edges, geometry, dir)
      const book = positions.get(find('Book').id)!
      const borrowable = positions.get(find('Borrowable').id)!
      return { dx: Math.abs(book.x - borrowable.x), dy: Math.abs(book.y - borrowable.y) }
    }
    const tb = spread('TB')
    const lr = spread('LR')
    expect(tb.dy).toBeGreaterThan(tb.dx / 4)
    expect(lr.dx).toBeGreaterThan(0)
    expect(lr.dx).toBeGreaterThan(lr.dy / 4)
  })
})
