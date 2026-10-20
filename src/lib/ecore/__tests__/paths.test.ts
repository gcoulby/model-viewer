// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { buildGraph } from '../buildGraph'
import { layoutByFile } from '../layoutGroups'
import { normalisePath, resolveRelative } from '../paths'
import { parseModel } from '../parse'
import type { ClassGraphNode } from '@/types/graph'
import type { NodeGeometry } from '@/types/view'

const pkg = (name: string, body: string) =>
  `<ecore:EPackage xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" name="${name}" nsURI="http://${name}">${body}</ecore:EPackage>`
const cls = (name: string, supers = '') =>
  `<eClassifiers xsi:type="ecore:EClass" name="${name}"${supers ? ` eSuperTypes="${supers}"` : ''}/>`

const find = (graph: ReturnType<typeof buildGraph>, name: string) =>
  [...graph.nodes.values()].find((n) => n.name === name)

describe('paths', () => {
  it('normalises dot segments', () => {
    expect(normalisePath('a/./b/../c.ecore')).toBe('a/c.ecore')
    expect(normalisePath('../x.ecore')).toBe('../x.ecore')
    expect(resolveRelative('models/sub', '../core/base.ecore')).toBe('models/core/base.ecore')
  })
})

describe('relative references', () => {
  const base = parseModel(pkg('base', cls('Base')), 'core/base.ecore', 0)
  const sameName = parseModel(pkg('other', cls('Base')), 'other/base.ecore', 1)
  const child = parseModel(
    pkg('child', cls('A', '../core/base.ecore#//Base') + cls('B', 'base.ecore#//Base') + cls('C', '../nope/gone.ecore#//Gone')),
    'sub/child.ecore',
    2,
  )

  it('resolves against the referencing file, so equal names in different folders stay apart', () => {
    const graph = buildGraph([base, sameName, child])
    const ids = [...graph.nodes.values()].filter((n) => n.name === 'Base' && n.kind === 'class').map((n) => n.id)
    expect(ids).toHaveLength(2)
    expect((find(graph, 'A') as ClassGraphNode).superIds).toEqual([ids[0]])
    expect(graph.nodes.get((find(graph, 'A') as ClassGraphNode).superIds[0] ?? '')).toMatchObject({
      package: { fileName: 'core/base.ecore' },
    })
  })

  it('shows unresolved externals by their path from the root', () => {
    const graph = buildGraph([base, child])
    const gone = graph.nodes.get((find(graph, 'C') as ClassGraphNode).superIds[0] ?? '')
    expect(gone).toMatchObject({ kind: 'external', source: 'nope/gone.ecore' })
  })

  it('joins an external to a file chosen by hand', () => {
    const lib = parseModel(pkg('lib', cls('Gone')), 'elsewhere/lib.ecore', 3)
    const plain = buildGraph([lib, child])
    const before = find(plain, 'C') as ClassGraphNode
    expect(plain.nodes.get(before.superIds[0] ?? '')?.kind).toBe('external')
    const linked = buildGraph([lib, child], new Map([['nope/gone.ecore', 'elsewhere/lib.ecore']]))
    const c = find(linked, 'C') as ClassGraphNode
    expect(linked.nodes.get(c.superIds[0] ?? '')).toMatchObject({ kind: 'class', name: 'Gone' })
  })
})

describe('layoutByFile', () => {
  it('keeps each file in its own block', () => {
    const a = parseModel(pkg('a', cls('A1') + cls('A2')), 'a.ecore', 0)
    const b = parseModel(pkg('b', cls('B1') + cls('B2')), 'b.ecore', 1)
    const graph = buildGraph([a, b])
    const nodes = [...graph.nodes.values()]
    const geometry = new Map<string, NodeGeometry>(
      nodes.map((n) => [n.id, { width: 100, height: 50, headerHeight: 30, stereotype: '', compartments: [], collapsed: false }]),
    )
    const positions = layoutByFile(nodes, graph.edges, geometry, 'TB')
    const xs = (file: string) =>
      nodes.filter((n) => n.kind !== 'external' && n.package.fileName === file).map((n) => positions.get(n.id)?.x ?? NaN)
    const [aMax, bMin] = [Math.max(...xs('a.ecore')) + 100, Math.min(...xs('b.ecore'))]
    const ys = (file: string) =>
      nodes.filter((n) => n.kind !== 'external' && n.package.fileName === file).map((n) => positions.get(n.id)?.y ?? NaN)
    const separated = aMax <= bMin || Math.max(...ys('a.ecore')) + 50 <= Math.min(...ys('b.ecore'))
    expect(separated).toBe(true)
  })
})
