import type {
  Multiplicity,
  ParsedAttribute,
  ParsedClass,
  ParsedClassifier,
  ParsedModel,
  ParsedOperation,
  ParsedPackage,
  ParsedReference,
} from '@/types/ecore'

const UNNAMED = '(unnamed)'

function children(el: Element, name: string): Element[] {
  return Array.from(el.children).filter((c) => c.localName === name)
}

function xsiType(el: Element): string {
  const t = el.getAttribute('xsi:type') ?? ''
  return t.includes(':') ? (t.split(':').pop() ?? '') : t
}

function intAttr(el: Element, name: string, fallback: number): number {
  const v = el.getAttribute(name)
  if (v == null || v === '') return fallback
  const n = parseInt(v, 10)
  return Number.isNaN(n) ? fallback : n
}

function boolAttr(el: Element, name: string): boolean {
  return el.getAttribute(name) === 'true'
}

function lastToken(value: string): string {
  const parts = value.trim().split(/\s+/)
  return parts[parts.length - 1] ?? ''
}

function typeToken(el: Element): string {
  let value = el.getAttribute('eType')
  if (!value) {
    const generic = children(el, 'eGenericType')[0]
    if (generic) value = generic.getAttribute('eClassifier')
  }
  return value ? lastToken(value) : ''
}

function multiplicity(el: Element): Multiplicity {
  return { lower: intAttr(el, 'lowerBound', 0), upper: intAttr(el, 'upperBound', 1) }
}

export function parseModel(text: string, fileName: string, index: number): ParsedModel {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const parserError = doc.getElementsByTagName('parsererror')[0]
  if (parserError) {
    const firstLine = (parserError.textContent ?? '').trim().split('\n')[0] ?? ''
    throw new Error(`${fileName}: this is not valid XML. ${firstLine.slice(0, 140)}`)
  }
  const root = doc.documentElement
  const packageElements = root.localName === 'EPackage' ? [root] : children(root, 'EPackage')
  if (!packageElements.length) {
    throw new Error(`${fileName}: no EPackage found, so this does not look like an Ecore file.`)
  }
  const model: ParsedModel = {
    index,
    fileName,
    key: fileName.replace(/^.*[\\/]/, '').toLowerCase(),
    roots: [],
    packages: [],
    classifiers: [],
  }
  packageElements.forEach((el, i) => {
    model.roots.push(parsePackage(el, null, i === 0 ? '/' : `/${i}`, model))
  })
  return model
}

function parsePackage(
  el: Element,
  parent: ParsedPackage | null,
  path: string,
  model: ParsedModel,
): ParsedPackage {
  const name = el.getAttribute('name') || UNNAMED
  const pkg: ParsedPackage = {
    id: `${model.index}|${path}`,
    name,
    fullName: parent ? `${parent.fullName}.${name}` : name,
    nsURI: el.getAttribute('nsURI') ?? '',
    nsPrefix: el.getAttribute('nsPrefix') ?? '',
    path,
    subpackages: [],
    classifiers: [],
  }
  model.packages.push(pkg)
  for (const c of children(el, 'eClassifiers')) {
    const classifier = parseClassifier(c, pkg, model)
    if (classifier) {
      pkg.classifiers.push(classifier)
      model.classifiers.push(classifier)
    }
  }
  for (const sp of children(el, 'eSubpackages')) {
    const subPath = `${path}/${sp.getAttribute('name') || '?'}`
    pkg.subpackages.push(parsePackage(sp, pkg, subPath, model))
  }
  return pkg
}

function parseClassifier(
  el: Element,
  pkg: ParsedPackage,
  model: ParsedModel,
): ParsedClassifier | null {
  const type = xsiType(el) || 'EClass'
  const name = el.getAttribute('name') || UNNAMED
  const path = `${pkg.path}/${name}`
  const base = { id: `${model.index}|${path}`, name, path, packageId: pkg.id }

  if (type === 'EClass') return parseClass(el, base)
  if (type === 'EEnum') {
    return {
      ...base,
      kind: 'enum',
      literals: children(el, 'eLiterals').map((l, i) => ({
        name: l.getAttribute('name') ?? '',
        value: intAttr(l, 'value', i),
      })),
    }
  }
  if (type === 'EDataType') {
    return { ...base, kind: 'datatype', instanceClassName: el.getAttribute('instanceClassName') ?? '' }
  }
  return null
}

function parseClass(
  el: Element,
  base: { id: string; name: string; path: string; packageId: string },
): ParsedClass {
  const superRaw = new Set(
    (el.getAttribute('eSuperTypes') ?? '').trim().split(/\s+/).filter(Boolean),
  )
  for (const g of children(el, 'eGenericSuperTypes')) {
    const v = g.getAttribute('eClassifier')
    if (v) superRaw.add(lastToken(v))
  }

  const attributes: ParsedAttribute[] = []
  const references: ParsedReference[] = []
  for (const f of children(el, 'eStructuralFeatures')) {
    const declared = xsiType(f)
    const featureType =
      declared || (f.hasAttribute('containment') || f.hasAttribute('eOpposite') ? 'EReference' : 'EAttribute')
    const name = f.getAttribute('name') || UNNAMED
    const common = {
      name,
      path: `${base.path}/${name}`,
      multiplicity: multiplicity(f),
      typeRaw: typeToken(f),
      derived: boolAttr(f, 'derived'),
      transient: boolAttr(f, 'transient'),
      volatile: boolAttr(f, 'volatile'),
      readOnly: f.getAttribute('changeable') === 'false',
      defaultValue: f.getAttribute('defaultValueLiteral'),
    }
    if (featureType === 'EReference') {
      references.push({
        ...common,
        kind: 'reference',
        containment: boolAttr(f, 'containment'),
        oppositeRaw: f.getAttribute('eOpposite') ?? '',
      })
    } else {
      attributes.push({ ...common, kind: 'attribute', isId: boolAttr(f, 'iD') })
    }
  }

  const operations: ParsedOperation[] = children(el, 'eOperations').map((o) => ({
    name: o.getAttribute('name') || UNNAMED,
    typeRaw: typeToken(o),
    multiplicity: multiplicity(o),
    parameters: children(o, 'eParameters').map((p) => ({
      name: p.getAttribute('name') ?? '',
      typeRaw: typeToken(p),
      multiplicity: multiplicity(p),
    })),
  }))

  return {
    ...base,
    kind: 'class',
    abstract: boolAttr(el, 'abstract'),
    interface: boolAttr(el, 'interface'),
    attributes,
    references,
    operations,
    superRaw: [...superRaw],
  }
}
