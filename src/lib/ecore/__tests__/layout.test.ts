// @vitest-environment jsdom
import Elk from 'elkjs/lib/elk.bundled.js'
import { describe, expect, it } from 'vitest'
import { defaultViewOptions } from '@/data/viewOptions'
import { SAMPLES } from '@/data/samples'
import type { ClassGraphNode, DrawnEdge, GraphEdge, GraphNode } from '@/types/graph'
import type { LayoutAlgorithm, NodeGeometry, ViewOptions } from '@/types/view'
import { buildGraph } from '../buildGraph'
import type { Box } from '../edgeGeometry'
import { layoutWithElk } from '../elkLayout'
import { attributeRow, capRows, multiplicitySuffix, operationRow, referenceRow } from '../format'
import { layoutWithDagre } from '../layoutGroups'
import type { LayoutResult } from '../layout'
import { computeGeometry, createTextMeasurer } from '../measure'
import { parseModel } from '../parse'
import { routeEdges } from '../routing'
import { layoutEdges } from '../shaping'
import { computeParallel, computeVisible } from '../visibleGraph'

const options = (overrides: Partial<ViewOptions> = {}): ViewOptions => ({ ...defaultViewOptions(), ...overrides })

const graph = buildGraph([parseModel(SAMPLES[0]!.files[0]!.text, 'library.ecore', 0)])
const measure = createTextMeasurer()
const elk = new Elk()
const find = (name: string) => [...graph.nodes.values()].find((n) => n.name === name) as GraphNode

function geometryFor(opts: ViewOptions, g = graph) {
  const visible = computeVisible(g, opts)
  const geometry = new Map<string, NodeGeometry>()
  for (const n of visible.nodes) geometry.set(n.id, computeGeometry(n, opts, false, measure))
  return { visible, geometry }
}

const dagre = (opts: ViewOptions, g = graph) => {
  const { visible, geometry } = geometryFor(opts, g)
  return { visible, geometry, ...layoutWithDagre(visible.nodes, visible.edges, geometry, opts) }
}

const withElk = async (opts: ViewOptions, g = graph) => {
  const { visible, geometry } = geometryFor(opts, g)
  return { visible, geometry, ...(await layoutWithElk(elk, visible.nodes, visible.edges, geometry, opts)) }
}

function overlaps(nodes: GraphNode[], geometry: Map<string, NodeGeometry>, positions: LayoutResult['positions']) {
  const boxes = nodes.map((n) => ({ ...positions.get(n.id)!, ...geometry.get(n.id)! }))
  let count = 0
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!
      const b = boxes[j]!
      if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) count++
    }
  return count
}

const pkg = (body: string, name = 'p') =>
  `<ecore:EPackage xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" name="${name}" nsURI="http://${name}">${body}</ecore:EPackage>`

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

describe('geometry', () => {
  it('keeps widths within bounds', () => {
    const { geometry } = geometryFor(options({ operations: true }))
    for (const geo of geometry.values()) {
      expect(geo.width).toBeGreaterThanOrEqual(132)
      expect(geo.width).toBeLessThanOrEqual(430)
    }
  })
})

describe('dagre layout', () => {
  const classic = (overrides: Partial<ViewOptions> = {}) => options({ algorithm: 'dagre', ...overrides })

  it('places every visible node at a finite position', () => {
    const { visible, positions } = dagre(classic())
    for (const n of visible.nodes) {
      expect(Number.isFinite(positions.get(n.id)?.x)).toBe(true)
      expect(Number.isFinite(positions.get(n.id)?.y)).toBe(true)
    }
  })

  it('puts isolated nodes below the connected graph', () => {
    const text = pkg(`
      <eClassifiers xsi:type="ecore:EClass" name="Base"/>
      <eClassifiers xsi:type="ecore:EClass" name="Child" eSuperTypes="#//Base"/>
      <eClassifiers xsi:type="ecore:EClass" name="Lonely"/>
      <eClassifiers xsi:type="ecore:EEnum" name="Unused"/>`)
    const small = buildGraph([parseModel(text, 'p.ecore', 0)])
    const { visible, geometry, positions } = dagre(classic(), small)
    const named = (name: string) => visible.nodes.find((n) => n.name === name)!
    const bottom = Math.max(
      ...['Base', 'Child'].map((name) => positions.get(named(name).id)!.y + geometry.get(named(name).id)!.height),
    )
    expect(positions.get(named('Lonely').id)!.y).toBeGreaterThan(bottom)
    expect(positions.get(named('Unused').id)!.y).toBeGreaterThan(bottom)
  })

  it('changes the main axis with the direction', () => {
    const spread = (direction: ViewOptions['direction']) => {
      const { positions } = dagre(classic({ direction }))
      const book = positions.get(find('Book').id)!
      const borrowable = positions.get(find('Borrowable').id)!
      return { dx: book.x - borrowable.x, dy: book.y - borrowable.y }
    }
    expect(spread('TB').dy).toBeGreaterThan(0)
    expect(spread('BT').dy).toBeLessThan(0)
    expect(spread('LR').dx).toBeGreaterThan(0)
    expect(spread('RL').dx).toBeLessThan(0)
  })

  it('lays out parallel edges between neighbours instead of falling back to a grid', () => {
    const text = pkg(`
      <eClassifiers xsi:type="ecore:EClass" name="Field">
        <eStructuralFeatures xsi:type="ecore:EReference" name="x" eType="#//Axis" containment="true"/>
        <eStructuralFeatures xsi:type="ecore:EReference" name="y" eType="#//Axis" containment="true"/>
      </eClassifiers>
      <eClassifiers xsi:type="ecore:EClass" name="Axis"/>`)
    const g = buildGraph([parseModel(text, 'p.ecore', 0)])
    const { visible, positions } = dagre(classic(), g)
    const [field, axis] = ['Field', 'Axis'].map((name) => positions.get(visible.nodes.find((n) => n.name === name)!.id)!)
    expect(axis!.y).toBeGreaterThan(field!.y)
  })

  it('returns routes that run from the edge source to its target', () => {
    const { visible, geometry, positions, routes } = dagre(classic())
    const inherit = visible.edges.find((e) => e.kind === 'inherit' && routes.has(e.id))!
    const route = routes.get(inherit.id)!
    const sub = positions.get(inherit.from)!
    const subGeo = geometry.get(inherit.from)!
    expect(Math.abs(route[0]!.y - sub.y)).toBeLessThan(subGeo.height + 1)
  })

  it('keeps unrelated boxes out of the hierarchy in inheritance mode', () => {
    const { positions } = dagre(classic({ layoutMode: 'inheritance', pullIn: false }))
    expect(positions.get(find('Loan').id)!.y).toBeGreaterThan(positions.get(find('Item').id)!.y)
  })

  it('spreads boxes further apart when spacious', () => {
    const extent = (spacing: ViewOptions['spacing']) => {
      const xs = [...dagre(classic({ spacing })).positions.values()].map((p) => p.x)
      return Math.max(...xs) - Math.min(...xs)
    }
    expect(extent('spacious')).toBeGreaterThan(extent('compact'))
  })
})

describe('shaping edges', () => {
  it('pulls in boxes the chosen links miss', () => {
    const { visible } = geometryFor(options())
    const loan = find('Loan')
    const touches = (edges: DrawnEdge[]) => edges.some((e) => e.from === loan.id || e.to === loan.id)
    const opts = (pullIn: boolean) => options({ layoutMode: 'inheritance', pullIn })
    expect(touches(layoutEdges(visible.nodes, visible.edges, opts(false)))).toBe(false)
    expect(touches(layoutEdges(visible.nodes, visible.edges, opts(true)))).toBe(true)
  })

  it('uses no links for the grid', () => {
    const { visible } = geometryFor(options())
    expect(layoutEdges(visible.nodes, visible.edges, options({ algorithm: 'grid' }))).toEqual([])
  })
})

describe('ELK layouts', () => {
  const algorithms: LayoutAlgorithm[] = ['layered', 'tree', 'stress', 'force', 'radial', 'grid']

  it.each(algorithms)('%s places every box without overlaps', async (algorithm) => {
    for (const layoutMode of ['layered', 'inheritance'] as const) {
      const { visible, geometry, positions } = await withElk(options({ algorithm, layoutMode }))
      for (const n of visible.nodes) expect(Number.isFinite(positions.get(n.id)?.x)).toBe(true)
      expect(overlaps(visible.nodes, geometry, positions)).toBe(0)
    }
  })

  it('puts supertypes above subtypes and routes the links', async () => {
    const { visible, positions, routes } = await withElk(options())
    expect(positions.get(find('Item').id)!.y).toBeLessThan(positions.get(find('Book').id)!.y)
    const inherit = visible.edges.filter((e) => e.kind === 'inherit' && e.from !== e.to)
    for (const e of inherit) expect(routes.get(e.id)?.length).toBeGreaterThan(1)
  })

  it.each(['layered', 'stress', 'grid'] as const)('keeps package frames apart with %s', async (algorithm) => {
    const opts = options({ algorithm, grouping: 'package' })
    const { visible, geometry, positions } = await withElk(opts)
    const audit = visible.nodes.filter((n) => n.kind !== 'external' && n.package.fullName.endsWith('audit'))
    const rest = visible.nodes.filter((n) => n.kind !== 'external' && !audit.includes(n))
    const bounds = (nodes: GraphNode[]) => {
      const boxes = nodes.map((n) => ({ ...positions.get(n.id)!, ...geometry.get(n.id)! }))
      return {
        minX: Math.min(...boxes.map((b) => b.x)),
        maxX: Math.max(...boxes.map((b) => b.x + b.width)),
        minY: Math.min(...boxes.map((b) => b.y)),
        maxY: Math.max(...boxes.map((b) => b.y + b.height)),
      }
    }
    const a = bounds(audit)
    const b = bounds(rest)
    const apart = a.maxX <= b.minX || b.maxX <= a.minX || a.maxY <= b.minY || b.maxY <= a.minY
    expect(audit.length).toBeGreaterThan(0)
    expect(apart).toBe(true)
  })
})

describe('routing', () => {
  const a: Box = { x: 0, y: 0, width: 100, height: 40 }
  const b: Box = { x: 200, y: 200, width: 100, height: 40 }
  const c: Box = { x: -200, y: 200, width: 100, height: 40 }
  const inherit = (id: string, from: string, to: string): GraphEdge => ({ id, kind: 'inherit', from, to })
  const one = { index: 0, count: 1, flip: 1 as const }

  it('draws square links between facing sides', () => {
    const boxes = new Map([['A', a], ['B', b]])
    const path = routeEdges(boxes, [{ edge: inherit('e', 'B', 'A'), parallel: one }], 'orthogonal', 'TB').get('e')!
    expect(path.start).toEqual({ x: 250, y: 200 })
    expect(path.end).toEqual({ x: 50, y: 40 })
    expect(path.d).toContain('Q')
  })

  it('brings every subtype to the same point on its supertype', () => {
    const boxes = new Map([['A', a], ['B', b], ['C', c]])
    const edges = [inherit('e1', 'B', 'A'), inherit('e2', 'C', 'A')]
    const parallel = computeParallel(edges)
    const paths = routeEdges(boxes, edges.map((edge) => ({ edge, parallel: parallel.get(edge.id)! })), 'orthogonal', 'TB')
    expect(paths.get('e1')!.end).toEqual(paths.get('e2')!.end)
  })

  it('uses the layout route until a box moves', () => {
    const boxes = new Map([['A', a], ['B', b]])
    const route = [{ x: 250, y: 200 }, { x: 250, y: 120 }, { x: 50, y: 120 }, { x: 50, y: 40 }]
    const laidOut = { routes: new Map([['e', route]]), boxes: new Map(boxes) }
    const input = [{ edge: inherit('e', 'B', 'A'), parallel: one }]
    expect(routeEdges(boxes, input, 'routed', 'TB', laidOut).get('e')!.start).toEqual(route[0])
    const moved = new Map([['A', a], ['B', { ...b, x: 400 }]])
    expect(routeEdges(moved, input, 'routed', 'TB', laidOut).get('e')!.start.x).toBe(450)
  })

  it('spreads links leaving one side in the order of their far ends', () => {
    const boxes = new Map([['A', a], ['B', b], ['C', c]])
    const ref = (id: string, to: string): GraphEdge => ({
      id,
      kind: 'reference',
      from: 'A',
      to,
      forward: (find('Library') as ClassGraphNode).references[0]!,
      back: null,
    })
    const edges = [ref('toB', 'B'), ref('toC', 'C')]
    const parallel = computeParallel(edges)
    const paths = routeEdges(boxes, edges.map((edge) => ({ edge, parallel: parallel.get(edge.id)! })), 'curved', 'TB')
    expect(paths.get('toC')!.start.x).toBeLessThan(paths.get('toB')!.start.x)
  })
})
