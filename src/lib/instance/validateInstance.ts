import { pathOf } from '@/lib/ecore/edit/dom'
import type { Problem, Severity } from '@/lib/ecore/edit/validate'
import { conforms, type MetaFeature, type Metamodel } from './metamodel'
import type { InstanceFile } from './objectGraph'
import { allObjects, attributeValues, classOf, labelOf, objectByFragment, referenceTokens, rootObjects, XMI_NS } from './xmi'

const INT = /^[+-]?\d+$/
const FLOAT = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/
// EMF writes dates as `yyyy-MM-dd'T'HH:mm:ss.SSSZ`; a plain date is accepted too.
const DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?([+-]\d{4}|Z)?)?$/

function badValue(feature: MetaFeature, value: string): string | null {
  switch (feature.valueKind) {
    case 'int':
      return INT.test(value.trim()) ? null : `${feature.name} must be a whole number, not "${value}"`
    case 'float':
      return FLOAT.test(value.trim()) ? null : `${feature.name} must be a number, not "${value}"`
    case 'boolean':
      return value === 'true' || value === 'false' ? null : `${feature.name} must be true or false, not "${value}"`
    case 'date':
      return DATE.test(value.trim()) ? null : `${feature.name} must be a date such as 2026-11-16, not "${value}"`
    case 'enum':
      return feature.literals.includes(value) ? null : `${feature.name} must be one of ${feature.literals.join(', ')}, not "${value}"`
    default:
      return null
  }
}

/**
 * Checks instances against their metamodel, as EMF's Diagnostician would: every object's class exists and is
 * concrete, required features are set, counts fit their bounds, values fit their types, references resolve to
 * objects of the right class, and IDs are unique within a file.
 */
export function validateInstances(meta: Metamodel, files: InstanceFile[]): Problem[] {
  const problems: Problem[] = []
  for (const file of files) {
    const report = (el: Element, severity: Severity, code: string, message: string) =>
      problems.push({ severity, code, message, ref: { key: file.key, path: pathOf(el) } })

    for (const root of rootObjects(file.doc)) {
      if (!classOf(meta, root)) {
        const uri = root.namespaceURI ?? ''
        const known = [...meta.classes.values()].some((c) => c.nsURI === uri)
        report(
          root,
          'error',
          'UnknownClass',
          known ? `There is no class ${root.localName} in ${uri}` : `The metamodel ${uri || '(no namespace)'} isn't open, so this instance can't be checked`,
        )
      }
    }

    const ids = new Map<string, Element[]>()
    for (const el of allObjects(meta, file.doc)) {
      const cls = classOf(meta, el)
      if (!cls) {
        if (el.parentElement && el.parentElement.localName !== 'XMI' && el.namespaceURI !== XMI_NS) {
          report(el, 'error', 'UnknownClass', `The class of this ${el.localName} isn't in the metamodel`)
        }
        continue
      }
      if (cls.abstract) report(el, 'error', 'AbstractClass', `${cls.name} is abstract, so it can't have instances`)

      const known = new Set(cls.features.map((f) => f.name))
      const builtIn = new Set(['type', 'version', 'schemaLocation', 'id', 'uuid', 'href'])
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith('xmlns') || attr.prefix === 'xsi' || attr.prefix === 'xmi' || builtIn.has(attr.localName) && attr.prefix) continue
        if (!known.has(attr.localName)) report(el, 'warning', 'UnknownFeature', `${cls.name} has no feature ${attr.localName}`)
      }
      for (const child of Array.from(el.children)) {
        if (!known.has(child.localName)) report(el, 'warning', 'UnknownFeature', `${cls.name} has no feature ${child.localName}`)
      }

      for (const feature of cls.features) {
        if (feature.readOnly) continue
        if (feature.kind === 'attribute') {
          const values = attributeValues(el, feature)
          if (!values.length && feature.lower > 0 && feature.defaultValue === null) {
            report(el, 'error', 'RequiredFeature', `${feature.name} is required`)
          }
          if (feature.many && feature.upper > 0 && values.length > feature.upper) {
            report(el, 'error', 'TooManyValues', `${feature.name} holds at most ${feature.upper}, but has ${values.length}`)
          }
          for (const value of values) {
            const problem = badValue(feature, value)
            if (problem) report(el, 'error', 'InvalidValue', problem)
          }
          if (feature.isId && values[0]) {
            const list = ids.get(values[0])
            if (list) list.push(el)
            else ids.set(values[0], [el])
          }
          continue
        }

        const targets = feature.containment
          ? Array.from(el.children).filter((c) => c.localName === feature.name)
          : referenceTokens(el, feature)
        if (!targets.length && feature.lower > 0) report(el, 'error', 'RequiredFeature', `${feature.name} is required`)
        if (feature.upper > 0 && targets.length > feature.upper) {
          report(el, 'error', 'TooManyValues', `${feature.name} holds at most ${feature.upper}, but has ${targets.length}`)
        }
        if (feature.containment) continue
        for (const token of referenceTokens(el, feature)) {
          if (token.includes('#') && !token.startsWith('#')) {
            report(el, 'warning', 'CrossFileReference', `${feature.name} points into another file (${token}), which isn't checked`)
            continue
          }
          const target = objectByFragment(meta, file.doc, token)
          if (!target) {
            report(el, 'error', 'UnresolvedReference', `${feature.name} points at ${token}, which doesn't exist`)
            continue
          }
          const targetClass = classOf(meta, target)
          if (targetClass && !conforms(meta, targetClass.id, feature.typeId)) {
            report(el, 'error', 'WrongType', `${feature.name} must point at a ${feature.typeName}, not the ${targetClass.name} ${labelOf(meta, target).name}`.trim())
          }
        }
      }
    }

    for (const [id, list] of ids) {
      if (list.length < 2) continue
      for (const el of list) report(el, 'error', 'UniqueID', `Another object in this file also has the ID ${id}`)
    }
  }
  return problems
}
