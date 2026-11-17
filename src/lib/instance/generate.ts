import { elementAt, pathOf, type ElementRef } from '@/lib/ecore/edit/dom'
import { parseXml, serializeXml } from '@/lib/workspace/xml'
import { concreteFamily, conforms, type MetaClass, type MetaFeature, type Metamodel } from './metamodel'
import { sampleRegex } from './sampleRegex'
import {
  allObjects,
  classOf,
  createObject,
  createObjectAnywhere,
  newInstanceText,
  objectByFragment,
  referenceTokens,
  setReferences,
  setValue,
  setValues,
  type InstanceDocs,
} from './xmi'

export type GenerateSize = 'small' | 'medium' | 'large'

export interface GenerateOptions {
  root: MetaClass
  size: GenerateSize
  /** Fill optional features too, not only the required ones. */
  optional: boolean
  seed: number
}

export interface GenerateResult {
  text: string
  objects: number
  /** Set when the object limit stopped the generator before everything required was made. */
  capped: boolean
}

/** How many values a many-valued feature gets at most, how many objects in all, and how deep containment goes. */
export const SIZES: Record<GenerateSize, { many: number; cap: number; depth: number }> = {
  small: { many: 2, cap: 40, depth: 4 },
  medium: { many: 4, cap: 150, depth: 6 },
  large: { many: 8, cap: 600, depth: 8 },
}

/** A small seeded random generator (mulberry32), so a seed always gives the same model. */
export function random(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1))
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)]!
  return { next, int, pick }
}

const WORDS = [
  'amber', 'atlas', 'birch', 'cedar', 'comet', 'delta', 'ember', 'fern', 'flint', 'harbor', 'iris', 'juniper',
  'lumen', 'maple', 'meadow', 'nova', 'onyx', 'orbit', 'pebble', 'quartz', 'raven', 'river', 'saffron', 'sierra',
  'slate', 'summit', 'tidal', 'umber', 'vale', 'willow',
]
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const DAY = 86_400_000

/**
 * Builds an instance of the metamodel from `root` down, as a starting point to edit: containment first (to the
 * size's depth and object limit), then attribute values, then references, making any object a required
 * reference needs and nothing in the file supplies. Ecore Studio constraints on features are followed:
 * counts, ranges, allowed values and patterns.
 */
export function generateInstance(meta: Metamodel, options: GenerateOptions): GenerateResult {
  const { root, optional } = options
  const size = SIZES[options.size]
  const rng = random(options.seed)
  const named = root.features.some((f) => f.name === 'name' && f.kind === 'attribute' && !f.many && f.valueKind === 'string')
  const original = newInstanceText(root, root.fileName, named ? `${lowerFirst(root.name)}1` : null)
  const doc = parseXml(original)
  const d: InstanceDocs = { doc: () => doc }
  const KEY = 'generated'
  const refOf = (el: Element): ElementRef => ({ key: KEY, path: pathOf(el) })
  let total = 1
  let capped = false
  const room = () => {
    if (total < size.cap) return true
    capped = true
    return false
  }

  /** How many values to give a feature: the constraints and bounds' minimum, up to the size's typical count. */
  const countFor = (f: MetaFeature, deep: boolean) => {
    const lo = Math.max(f.lower, f.constraints.minCount ?? 0)
    let hi = f.many ? (f.upper < 0 ? Infinity : f.upper) : 1
    if (f.constraints.maxCount !== undefined) hi = Math.min(hi, f.constraints.maxCount)
    if (hi <= lo || !optional || deep) return Math.min(lo, hi)
    if (!f.many) return rng.next() < 0.75 ? 1 : 0
    return rng.int(lo, Math.min(hi, Math.max(lo, size.many)))
  }

  // Containment, breadth first so every level gets filled before the limit is reached.
  const fresh: Element[] = []
  const contain = (start: Element, startDepth: number) => {
    const queue: [Element, number][] = [[start, startDepth]]
    while (queue.length) {
      const [el, depth] = queue.shift()!
      fresh.push(el)
      const cls = classOf(meta, el)
      for (const f of cls?.features ?? []) {
        if (!f.containment || f.readOnly) continue
        const classes = concreteFamily(meta, f.typeId)
        if (!classes.length) continue
        const n = countFor(f, depth >= size.depth)
        for (let i = 0; i < n && room(); i++) {
          const made = createObject(d, meta, refOf(el), f.name, rng.pick(classes))
          total++
          queue.push([elementAt(doc, made.path)!, depth + 1])
        }
      }
    }
  }

  const counters = new Map<string, number>()
  const nextNumber = (key: string) => {
    const n = (counters.get(key) ?? 0) + 1
    counters.set(key, n)
    return n
  }

  const valueFor = (f: MetaFeature, cls: MetaClass): string | null => {
    const c = f.constraints
    const allowed = f.valueKind === 'enum' ? (c.values?.filter((v) => f.literals.includes(v)) ?? f.literals) : c.values
    if (allowed?.length) return rng.pick(allowed)
    switch (f.valueKind) {
      case 'boolean':
        return rng.next() < 0.5 ? 'true' : 'false'
      case 'int': {
        const year = /year/i.test(f.name)
        const lo = Math.ceil(c.min ?? (year ? 1950 : 0))
        const hi = Math.floor(c.max ?? (year ? 2025 : Math.max(lo, 0) + 100))
        return String(rng.int(lo, Math.max(lo, hi)))
      }
      case 'float': {
        const lo = c.min ?? 0
        const hi = c.max ?? lo + 1000
        return (lo + rng.next() * (hi - lo)).toFixed(2)
      }
      case 'date': {
        const lo = c.min ?? Date.UTC(2000, 0, 1)
        const hi = c.max ?? Date.UTC(2025, 11, 31)
        return new Date(lo + Math.floor(rng.next() * ((hi - lo) / DAY + 1)) * DAY).toISOString().slice(0, 10)
      }
      default: {
        if (c.pattern) {
          const sample = sampleRegex(c.pattern.source.slice(4, -2), rng)
          if (sample !== null && c.pattern.test(sample)) return sample
        }
        if (f.isId) return `${lowerFirst(cls.name)}-${nextNumber(`id:${cls.name}`)}`
        if (/e-?mail/i.test(f.name)) return `user${nextNumber('email')}@example.com`
        if (/ur[li]$/i.test(f.name)) return `https://example.com/${rng.pick(WORDS)}`
        if (f.name === 'name') return `${lowerFirst(cls.name)}${nextNumber(`name:${cls.name}`)}`
        return `${capital(rng.pick(WORDS))} ${capital(rng.pick(WORDS))}`
      }
    }
  }

  const fillValues = (el: Element) => {
    const cls = classOf(meta, el)
    if (!cls) return
    for (const f of cls.features) {
      if (f.kind !== 'attribute' || f.readOnly) continue
      if (!f.many) {
        if (el.hasAttribute(f.name)) continue
        const required = f.lower > 0 && f.defaultValue === null
        if (!required && (!optional || rng.next() > 0.75)) continue
        const value = valueFor(f, cls)
        if (value !== null) setValue(d, refOf(el), f, value)
        continue
      }
      const n = countFor(f, false)
      const values: string[] = []
      for (let i = 0; i < n; i++) {
        const value = valueFor(f, cls)
        if (value !== null) values.push(value)
      }
      if (values.length) setValues(d, meta, refOf(el), f, values)
    }
  }

  const targetsOf = (el: Element, f: MetaFeature) =>
    referenceTokens(el, f).flatMap((t) => {
      const found = objectByFragment(meta, doc, t)
      return found ? [found] : []
    })

  /** Links `el` to `targets` through `f`, and each target back through the opposite, where it has room. */
  const link = (el: Element, f: MetaFeature, targets: Element[]) => {
    setReferences(d, meta, refOf(el), f, [...targetsOf(el, f), ...targets].map(refOf))
    if (!f.opposite) return
    for (const target of targets) {
      const back = classOf(meta, target)?.features.find((g) => g.name === f.opposite)
      if (!back || back.readOnly) continue
      const current = targetsOf(target, back)
      if (current.includes(el) || (back.upper > 0 && current.length >= back.upper)) continue
      setReferences(d, meta, refOf(target), back, [...current, el].map(refOf))
    }
  }

  const fillReferences = (el: Element) => {
    const cls = classOf(meta, el)
    for (const f of cls?.features ?? []) {
      if (f.kind !== 'reference' || f.containment || f.readOnly) continue
      const have = targetsOf(el, f)
      const want = countFor(f, false) - have.length
      if (want <= 0) continue
      const fits = (o: Element) => {
        const oc = classOf(meta, o)
        if (o === el || have.includes(o) || !oc || !conforms(meta, oc.id, f.typeId)) return false
        // A single-valued opposite that is already taken would be overwritten, so it is passed over.
        const back = f.opposite ? oc.features.find((g) => g.name === f.opposite) : null
        return !back || back.many || !targetsOf(o, back).length
      }
      const pool = allObjects(meta, doc).filter(fits)
      const picked: Element[] = []
      while (picked.length < want && pool.length) picked.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]!)
      // A required reference with nothing to point at gets a new object, put wherever it fits.
      const lo = Math.max(f.lower, f.constraints.minCount ?? 0) - have.length
      const classes = concreteFamily(meta, f.typeId)
      while (picked.length < lo && classes.length && room()) {
        const made = createObjectAnywhere(d, meta, KEY, rng.pick(classes))
        total++
        const created = elementAt(doc, made.path)!
        fresh.length = 0
        contain(created, size.depth)
        for (const o of fresh) {
          fillValues(o)
          pending.push(o)
        }
        picked.push(created)
      }
      if (picked.length) link(el, f, picked)
    }
  }

  contain(doc.documentElement, 0)
  for (const el of allObjects(meta, doc)) fillValues(el)
  const pending = allObjects(meta, doc)
  while (pending.length) fillReferences(pending.shift()!)

  return { text: serializeXml(doc as XMLDocument, original), objects: total, capped }
}
