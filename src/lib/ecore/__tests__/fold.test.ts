// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { defaultViewOptions } from '@/data/viewOptions'
import type { DependencyEdge, DrawnEdge, PackageBlockNode } from '@/types/graph'
import { buildGraph } from '../buildGraph'
import type { Box } from '../edgeGeometry'
import { blockIdOf, foldPackages } from '../fold'
import { parseModel } from '../parse'
import { portedBeforeLayout, portPredicate } from '../ports'
import { deflatePositions, inflateGeometry, portMargins, ROOM_PORT_STEP } from '../portRoom'
import { portTagLength, portTagShape, portTagTexts } from '../portTag'
import { routeEdges } from '../routing'
import { computeGeometry, createTextMeasurer } from '../measure'
import { scopeIdOf } from '../scope'
import { computeParallel, computeVisible } from '../visibleGraph'

const ns = 'xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
const ref = (name: string, type: string, extra = '') =>
  `<eStructuralFeatures xsi:type="ecore:EReference" name="${name}" eType="${type}"${extra}/>`

// Two packages: `a` (A1 inherits A2, A1 refers to B1 twice) and `a/b` (B1 refers back to A2).
const text = `<ecore:EPackage ${ns} name="a" nsURI="http://a">
  <eClassifiers xsi:type="ecore:EClass" name="A1" eSuperTypes="#//A2">${ref('one', '#//b/B1')}${ref('two', '#//b/B1')}</eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="A2"/>
  <eSubpackages name="b" nsURI="http://a/b">
    <eClassifiers xsi:type="ecore:EClass" name="B1">${ref('back', '#//A2')}</eClassifiers>
  </eSubpackages>
</ecore:EPackage>`
const model = parseModel(text, 'a.ecore', 0)
const graph = buildGraph([model])
const options = defaultViewOptions()
const visible = computeVisible(graph, options)
const [rootPkg] = model.roots
const subPkg = rootPkg!.subpackages[0]!
const rootScope = scopeIdOf(model, rootPkg!)
const subScope = scopeIdOf(model, subPkg)
const idOf = (name: string) => [...graph.nodes.values()].find((n) => n.name === name)!.id

describe('foldPackages', () => {
  it('leaves the graph alone with nothing folded', () => {
    const drawn = foldPackages(visible, new Set())
    expect(drawn.nodes).toBe(visible.nodes)
    expect(drawn.edges).toBe(visible.edges)
  })

  it('folds a package into one block and counts the links crossing it', () => {
    const drawn = foldPackages(visible, new Set([rootScope]))
    const block = drawn.nodes.find((n) => n.kind === 'package') as PackageBlockNode
    expect(block.id).toBe(blockIdOf(rootScope))
    expect(block.memberIds.sort()).toEqual([idOf('A1'), idOf('A2')].sort())
    expect(block.counts.classes).toBe(2)
    // A1 extends A2 stays inside the block; the two references out and the one back cross it.
    expect(block.outgoing).toBe(2)
    expect(block.incoming).toBe(1)
    expect(drawn.blockOf.get(idOf('A1'))).toBe(block.id)
    expect(drawn.nodeIds.has(idOf('B1'))).toBe(true)
  })

  it('merges links into one dependency per pair and marks a cycle', () => {
    const drawn = foldPackages(visible, new Set([rootScope, subScope]))
    const dependencies = drawn.edges.filter((e): e is DependencyEdge => e.kind === 'dependency')
    expect(dependencies).toHaveLength(1)
    const [dependency] = dependencies
    const counts = [dependency!.forward.length, dependency!.back.length].sort()
    expect(counts).toEqual([1, 2])
    expect(drawn.edges.some((e) => e.kind === 'inherit')).toBe(false)
  })

  it('keeps subpackages as their own blocks', () => {
    const drawn = foldPackages(visible, new Set([rootScope, subScope]))
    expect(drawn.nodes.filter((n) => n.kind === 'package')).toHaveLength(2)
  })
})

describe('ports', () => {
  const nodes = new Map(visible.nodes.map((n) => [n.id, n]))

  it('ports links between packages before layout in frames mode', () => {
    const ported = portedBeforeLayout(visible.edges, nodes, 'frames', 'package', new Map())
    const crossing = visible.edges.filter((e) => e.kind !== 'inherit')
    expect([...ported].sort()).toEqual(crossing.map((e) => e.id).sort())
    expect(portedBeforeLayout(visible.edges, nodes, 'none', 'package', new Map()).size).toBe(0)
  })

  it('lets a choice made by hand win over the mode', () => {
    const edge = visible.edges.find((e) => e.kind === 'inherit')!
    const crossing = visible.edges.find((e) => e.kind !== 'inherit')!
    const overrides = new Map([
      [edge.id, true],
      [crossing.id, false],
    ])
    const ported = portedBeforeLayout(visible.edges, nodes, 'frames', 'package', overrides)
    expect(ported.has(edge.id)).toBe(true)
    expect(ported.has(crossing.id)).toBe(false)
  })

  it('ports long links when drawing', () => {
    const near: Box = { x: 0, y: 0, width: 100, height: 40 }
    const far: Box = { x: 2000, y: 0, width: 100, height: 40 }
    const isPorted = portPredicate(nodes, 'long', 'none', new Map())
    const edge = visible.edges[0]!
    expect(isPorted(edge, near, far)).toBe(true)
    expect(isPorted(edge, near, { ...near, y: 200 })).toBe(false)
  })

  it('draws a ported link as two stubs with a tag at each end', () => {
    const edge = visible.edges.find((e) => e.kind === 'reference')!
    const boxes = new Map<string, Box>([
      [edge.from, { x: 0, y: 0, width: 100, height: 40 }],
      [edge.to, { x: 0, y: 400, width: 100, height: 40 }],
    ])
    const parallel = computeParallel([edge])
    const paths = routeEdges(boxes, [{ edge, parallel: parallel.get(edge.id)! }], 'orthogonal', 'TB', undefined, () => true)
    const path = paths.get(edge.id)!
    expect(path.ports).toBeDefined()
    expect(path.ports!.start.at.y).toBeGreaterThan(40)
    expect(path.ports!.end.at.y).toBeLessThan(400)
    expect(path.d.match(/M/g)).toHaveLength(2)
    const texts = portTagTexts(edge, (id) => graph.nodes.get(id)!.name)
    expect(texts.start).toContain('B1')
    expect(texts.end).toContain('A1.')
  })

  it('turns tags on the top and bottom of a box upright', () => {
    expect(portTagShape({ at: { x: 0, y: 0 }, direction: { x: 0, y: 1 } }, 'Axis', true).transform).toContain('rotate(-90)')
    expect(portTagShape({ at: { x: 0, y: 0 }, direction: { x: 1, y: 0 } }, 'Axis', true).transform).not.toContain('rotate')
  })
})

describe('room for ports', () => {
  const nameOf = (id: string) => graph.nodes.get(id)!.name
  const references = visible.edges.filter((e) => e.kind === 'reference')
  const ported = new Set(references.map((e) => e.id))
  const measure = createTextMeasurer()
  const geometry = new Map(visible.nodes.map((n) => [n.id, computeGeometry(n, options, false, measure)]))
  const textsOf = (e: DrawnEdge) => portTagTexts(e, nameOf)

  it('keeps space on the out side of a source and the in side of a target', () => {
    const room = portMargins(visible.edges, ported, geometry, 'TB', textsOf)
    expect(room.outSide).toBe('right')
    expect(room.inSide).toBe('left')
    const a1 = room.margins.get(idOf('A1'))!
    const longest = Math.max(...references.filter((e) => e.from === idOf('A1')).map((e) => portTagLength(textsOf(e).start)))
    expect(a1.right).toBeGreaterThan(longest)
    expect(a1.left).toBe(0)
    // B1 is the target of A1's two links and the source of its own.
    const b1 = room.margins.get(idOf('B1'))!
    expect(b1.left).toBeGreaterThan(0)
    expect(b1.right).toBeGreaterThan(0)
    expect(portMargins(visible.edges, ported, geometry, 'LR', textsOf).outSide).toBe('bottom')
  })

  it('grows boxes for layout and puts them back', () => {
    const room = portMargins(visible.edges, ported, geometry, 'TB', textsOf)
    const grown = inflateGeometry(geometry, room.margins)
    const m = room.margins.get(idOf('A1'))!
    expect(grown.get(idOf('A1'))!.width).toBe(geometry.get(idOf('A1'))!.width + m.left + m.right)
    const untagged = inflateGeometry(geometry, new Map([[idOf('A1'), m]]))
    expect(untagged.get(idOf('A2'))).toBe(geometry.get(idOf('A2')))
    const back = deflatePositions(new Map([[idOf('A1'), { x: 0, y: 0 }]]), room.margins)
    expect(back.get(idOf('A1'))).toEqual({ x: m.left, y: m.top })
  })

  it('draws roomed tags on the fixed sides, a step apart, however the boxes lie', () => {
    const [one, two] = references.filter((e) => e.from === idOf('A1'))
    const a1: Box = { x: 0, y: 0, width: 100, height: 20 }
    const b1: Box = { x: 0, y: 400, width: 100, height: 40 }
    const boxes = new Map([
      [idOf('A1'), a1],
      [idOf('B1'), b1],
    ])
    const parallel = computeParallel([one!, two!])
    const paths = routeEdges(
      boxes,
      [one!, two!].map((edge) => ({ edge, parallel: parallel.get(edge.id)! })),
      'orthogonal',
      'TB',
      undefined,
      () => true,
      { outSide: 'right', inSide: 'left' },
    )
    const starts = [one!, two!].map((e) => paths.get(e.id)!.ports!.start)
    for (const tag of starts) {
      expect(tag.at.x).toBeGreaterThan(a1.width)
      expect(tag.direction).toEqual({ x: 1, y: 0 })
    }
    expect(Math.abs(starts[0]!.at.y - starts[1]!.at.y)).toBeCloseTo(ROOM_PORT_STEP)
    for (const e of [one!, two!]) expect(paths.get(e.id)!.ports!.end.at.x).toBeLessThan(0)
  })
})
