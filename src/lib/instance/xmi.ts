import { createElement, elementAt, insertChild, moveElement, indentOf, pathOf, reindent, removeElement, type ElementRef } from '@/lib/ecore/edit/dom'
import { XMLNS_NS, XSI_NS } from '@/lib/ecore/edit/kinds'
import { conforms, type MetaClass, type MetaFeature, type Metamodel } from './metamodel'

/**
 * Instance files in EMF's XMI: the root object is the document element, named `prefix:Class`; contained
 * objects are child elements named after their containment feature, with `xsi:type` when their class is
 * not the feature's type; attributes are XML attributes (many-valued ones child elements); references
 * between objects are URI fragments such as `//@items.0`.
 */

export const XMI_NS = 'http://www.omg.org/XMI'

/** True for a document that is a model instance rather than an Ecore metamodel. */
export function isInstanceDoc(doc: Document): boolean {
  const root = doc.documentElement
  if (root.localName === 'EPackage') return false
  if (root.localName === 'XMI' && Array.from(root.children).some((c) => c.localName === 'EPackage')) return false
  return true
}

export function rootObjects(doc: Document): Element[] {
  const root = doc.documentElement
  return root.localName === 'XMI' && root.namespaceURI === XMI_NS ? Array.from(root.children) : [root]
}

/** True for a root object: the document element, or a child of an `xmi:XMI` wrapper. */
export const isRoot = (el: Element) => !el.parentElement || (el.parentElement === el.ownerDocument.documentElement && el.parentElement.localName === 'XMI')

/**
 * A stable path to an element that needs no metamodel: every step indexed. The diagram's object ids use it,
 * so ids can be followed through an edit before the metamodel is consulted.
 */
export function objectPath(el: Element): string {
  const steps: string[] = []
  let current: Element = el
  while (!isRoot(current)) {
    const parent = current.parentElement!
    const index = Array.from(parent.children).filter((c) => c.localName === current.localName).indexOf(current)
    steps.unshift(`@${current.localName}.${index}`)
    current = parent
  }
  const roots = rootObjects(el.ownerDocument)
  return `/${roots.length > 1 ? roots.indexOf(current) : ''}/${steps.join('/')}`
}

export const objectId = (index: number, el: Element) => `${index}|${objectPath(el)}`

/** Every element's object id, keyed by element, so ids can be followed through an edit. */
export function objectIds(doc: Document, index: number): Map<Element, string> {
  const ids = new Map<Element, string>()
  const stack = [...rootObjects(doc)]
  while (stack.length) {
    const el = stack.pop()!
    ids.set(el, objectId(index, el))
    stack.push(...Array.from(el.children))
  }
  return ids
}

export function elementForObjectPath(doc: Document, path: string): Element | null {
  let found: Element | null = null
  const stack = [...rootObjects(doc)]
  while (stack.length && !found) {
    const el = stack.pop()!
    if (objectPath(el) === path) found = el
    else stack.push(...Array.from(el.children))
  }
  return found
}

function typeName(value: string | null): { prefix: string; name: string } | null {
  if (!value) return null
  const colon = value.indexOf(':')
  return colon < 0 ? { prefix: '', name: value } : { prefix: value.slice(0, colon), name: value.slice(colon + 1) }
}

/** The feature of `parent`'s class that a child element named `tag` belongs to. */
export function featureOf(meta: Metamodel, parent: Element, tag: string): MetaFeature | null {
  return classOf(meta, parent)?.features.find((f) => f.name === tag) ?? null
}

/** The class of an object: its `xsi:type`, its root element's name, or its containment feature's type. */
export function classOf(meta: Metamodel, el: Element): MetaClass | null {
  const declared = typeName(el.getAttributeNS(XSI_NS, 'type') || el.getAttribute('xsi:type'))
  if (declared) {
    const uri = el.lookupNamespaceURI(declared.prefix || null) ?? ''
    return meta.byQName.get(`${uri}#${declared.name}`) ?? null
  }
  if (isRoot(el)) return meta.byQName.get(`${el.namespaceURI ?? ''}#${el.localName}`) ?? null
  const feature = featureOf(meta, el.parentElement!, el.localName)
  return feature?.containment && feature.typeId ? (meta.classes.get(feature.typeId) ?? null) : null
}

/** True for an element that is an object: a root, or the value of a containment reference. */
export function isObject(meta: Metamodel, el: Element): boolean {
  if (isRoot(el)) return true
  return !!featureOf(meta, el.parentElement!, el.localName)?.containment
}

export function childObjects(meta: Metamodel, el: Element): Element[] {
  const cls = classOf(meta, el)
  if (!cls) return []
  return Array.from(el.children).filter((c) => cls.features.find((f) => f.name === c.localName)?.containment)
}

/** Every object in a document, parents before children. */
export function allObjects(meta: Metamodel, doc: Document): Element[] {
  const out: Element[] = []
  const visit = (el: Element) => {
    out.push(el)
    for (const child of childObjects(meta, el)) visit(child)
  }
  for (const root of rootObjects(doc)) visit(root)
  return out
}

/** The URI fragment EMF writes for an object: `/` for the root, `//@items.0` and so on below it. */
export function fragmentOf(meta: Metamodel, el: Element): string {
  if (isRoot(el)) {
    const roots = rootObjects(el.ownerDocument)
    return roots.length > 1 ? `/${roots.indexOf(el)}` : '/'
  }
  const parent = el.parentElement!
  const feature = featureOf(meta, parent, el.localName)
  const index = Array.from(parent.children).filter((c) => c.localName === el.localName).indexOf(el)
  const step = `@${el.localName}${feature?.many === false ? '' : `.${index}`}`
  const above = fragmentOf(meta, parent)
  return `${above === '/' ? '/' : `${above}/`}${step}`.replace(/^\/@/, '//@')
}

/** Finds the object a reference names: a fragment path, or the value of an ID attribute. */
export function objectByFragment(meta: Metamodel, doc: Document, raw: string): Element | null {
  const fragment = raw.startsWith('#') ? raw.slice(1) : raw.includes('#') ? raw.slice(raw.indexOf('#') + 1) : raw
  const objects = allObjects(meta, doc)
  if (fragment.startsWith('/')) return objects.find((o) => fragmentOf(meta, o) === fragment) ?? null
  return (
    objects.find((o) => {
      const id = classOf(meta, o)?.features.find((f) => f.isId)
      return !!id && o.getAttribute(id.name) === fragment
    }) ?? null
  )
}

export function attributeValues(el: Element, feature: MetaFeature): string[] {
  if (!feature.many) {
    const value = el.getAttribute(feature.name)
    return value === null ? [] : [value]
  }
  return Array.from(el.children)
    .filter((c) => c.localName === feature.name)
    .map((c) => c.textContent ?? '')
}

export function referenceTokens(el: Element, feature: MetaFeature): string[] {
  const value = el.getAttribute(feature.name)
  const tokens = (value ?? '').trim().split(/\s+/).filter(Boolean)
  // A reference to another file is written as a child element with an href.
  for (const c of Array.from(el.children)) if (c.localName === feature.name && c.getAttribute('href')) tokens.push(c.getAttribute('href')!)
  return tokens
}

/** How an object reads in a tree row or on its box: its name (or ID, or first text) and its class. */
export function labelOf(meta: Metamodel, el: Element): { name: string; className: string } {
  const cls = classOf(meta, el)
  if (!cls) return { name: '', className: el.getAttribute('xsi:type')?.split(':').pop() ?? el.localName }
  const strings = cls.features.filter((f) => f.kind === 'attribute' && !f.many && f.valueKind === 'string')
  const pick = strings.find((f) => f.name === 'name') ?? cls.features.find((f) => f.isId) ?? strings.find((f) => el.hasAttribute(f.name))
  return { name: (pick && el.getAttribute(pick.name)) || '', className: cls.name }
}

/** The open instance document an edit works on. */
export interface InstanceDocs {
  doc: (key: string) => Document | null
}

function elementOf(d: InstanceDocs, ref: ElementRef): Element {
  const doc = d.doc(ref.key)
  const el = doc && elementAt(doc, ref.path)
  if (!el) throw new Error('That object no longer exists.')
  return el
}

/**
 * Runs `mutate`, then rewrites every reference to an object whose fragment the change moved: deleted objects
 * drop out of reference lists, and objects that shifted (a sibling deleted or reordered) are followed.
 */
function withRefactor<T>(meta: Metamodel, doc: Document, mutate: () => T): T {
  const before = new Map(allObjects(meta, doc).map((o) => [o, fragmentOf(meta, o)]))
  const result = mutate()
  const live = new Set(allObjects(meta, doc))
  const moved = new Map<string, string | null>()
  for (const [el, fragment] of before) {
    const now = live.has(el) ? fragmentOf(meta, el) : null
    if (now !== fragment) moved.set(fragment, now)
  }
  if (!moved.size) return result
  for (const el of live) {
    const cls = classOf(meta, el)
    for (const feature of cls?.features ?? []) {
      if (feature.kind !== 'reference' || feature.containment) continue
      const value = el.getAttribute(feature.name)
      if (!value) continue
      const tokens = value.trim().split(/\s+/).flatMap((token) => {
        const fragment = token.startsWith('#') ? token.slice(1) : token
        if (!moved.has(fragment)) return [token]
        const next = moved.get(fragment)
        return next === null || next === undefined ? [] : [next]
      })
      if (tokens.length) el.setAttribute(feature.name, tokens.join(' '))
      else el.removeAttribute(feature.name)
    }
  }
  return result
}

/** Binds a namespace prefix for `nsURI` on the root, reusing one already there. */
function prefixFor(doc: Document, cls: MetaClass): string {
  const root = doc.documentElement
  const existing = root.lookupPrefix(cls.nsURI)
  if (existing) return existing
  let prefix = cls.nsPrefix
  for (let n = 2; root.lookupNamespaceURI(prefix); n++) prefix = `${cls.nsPrefix}${n}`
  root.setAttributeNS(XMLNS_NS, `xmlns:${prefix}`, cls.nsURI)
  // Eclipse finds a package that is not registered through the file's schema locations, so a new one is listed.
  const locations = root.getAttributeNS(XSI_NS, 'schemaLocation')
  if (locations !== null && !locations.trim().split(/\s+/).filter((_, i) => i % 2 === 0).includes(cls.nsURI)) {
    const location = cls.packagePath === '/' ? cls.fileName : `${cls.fileName}#${cls.packagePath}`
    root.setAttributeNS(XSI_NS, 'xsi:schemaLocation', `${locations.trim()} ${cls.nsURI} ${location}`.trim())
  }
  return prefix
}

/** Writes `xsi:type` when the object's class is not exactly the feature's type, as EMF does. */
function setObjectType(doc: Document, el: Element, cls: MetaClass, feature: MetaFeature) {
  if (feature.typeId === cls.id) {
    el.removeAttributeNS(XSI_NS, 'type')
    el.removeAttribute('xsi:type')
    return
  }
  const root = doc.documentElement
  if (!root.lookupNamespaceURI('xsi')) root.setAttributeNS(XMLNS_NS, 'xmlns:xsi', XSI_NS)
  el.setAttributeNS(XSI_NS, 'xsi:type', `${prefixFor(doc, cls)}:${cls.name}`)
}

/** Where a new child for `feature` goes: after the feature's other values, before later features'. */
function insertionPoint(parent: Element, cls: MetaClass, feature: MetaFeature): Element | null {
  const order = cls.features.map((f) => f.name)
  const at = order.indexOf(feature.name)
  return Array.from(parent.children).find((c) => order.indexOf(c.localName) > at) ?? null
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** A name, when the class has one, so a new object is recognisable straight away. */
function nameNew(meta: Metamodel, doc: Document, el: Element, cls: MetaClass) {
  const name = cls.features.find((f) => f.name === 'name' && f.kind === 'attribute' && !f.many && f.valueKind === 'string' && !f.readOnly)
  if (!name) return
  const taken = new Set(allObjects(meta, doc).map((o) => o.getAttribute('name')))
  let n = 1
  while (taken.has(`${lowerFirst(cls.name)}${n}`)) n++
  el.setAttribute('name', `${lowerFirst(cls.name)}${n}`)
}

/** Adds a new object of class `cls` as a value of `parent`'s containment `featureName`, and returns where it is. */
export function createObject(d: InstanceDocs, meta: Metamodel, parent: ElementRef, featureName: string, cls: MetaClass): ElementRef {
  const doc = d.doc(parent.key)!
  const container = elementOf(d, parent)
  const parentClass = classOf(meta, container)
  const feature = parentClass?.features.find((f) => f.name === featureName)
  if (!parentClass || !feature?.containment) throw new Error(`${parentClass?.name ?? 'This object'} has no containment ${featureName}.`)
  if (!feature.many && Array.from(container.children).some((c) => c.localName === featureName)) {
    throw new Error(`${featureName} holds one object, and already has one.`)
  }
  if (cls.abstract || !conforms(meta, cls.id, feature.typeId)) throw new Error(`${cls.name} can't go in ${featureName}.`)
  const el = createElement(doc, featureName)
  setObjectType(doc, el, cls, feature)
  nameNew(meta, doc, el, cls)
  insertChild(container, el, insertionPoint(container, parentClass, feature))
  return { key: parent.key, path: pathOf(el) }
}

/** Deletes an object and returns what to select next: the next sibling, else the previous, else the parent. */
export function removeObject(d: InstanceDocs, meta: Metamodel, ref: ElementRef): ElementRef | null {
  const doc = d.doc(ref.key)!
  const el = elementOf(d, ref)
  if (isRoot(el)) {
    const roots = rootObjects(doc)
    if (roots.length < 2) throw new Error('A file keeps at least one object. Close the file to drop it.')
    const at = roots.indexOf(el)
    withRefactor(meta, doc, () => {
      removeElement(el)
      unwrapRoots(doc)
    })
    const left = rootObjects(doc)
    return { key: ref.key, path: pathOf(left[Math.min(at, left.length - 1)]!) }
  }
  const parent = el.parentElement!
  withRefactor(meta, doc, () => removeElement(el))
  const siblings = childObjects(meta, parent)
  const next = siblings.find((s) => s.localName === el.localName) ?? siblings[0] ?? parent
  return { key: ref.key, path: pathOf(next) }
}

/** Moves an object up (-1) or down (1) among the other values of its feature. */
export function shiftObject(d: InstanceDocs, meta: Metamodel, ref: ElementRef, delta: -1 | 1): ElementRef {
  const doc = d.doc(ref.key)!
  const el = elementOf(d, ref)
  const parent = el.parentElement
  if (!parent) return ref
  const siblings = isRoot(el) ? rootObjects(doc) : Array.from(parent.children).filter((c) => c.localName === el.localName)
  const target = siblings[siblings.indexOf(el) + delta]
  if (!target) return ref
  withRefactor(meta, doc, () => moveElement(el, parent, delta < 0 ? target : target.nextElementSibling))
  return { key: ref.key, path: pathOf(el) }
}

/**
 * Moves an object into `parent`'s feature of the same name, before `before` or after its other values.
 * Objects stay in one file and keep their feature name, as EMF's drag and drop does.
 */
export function moveObject(d: InstanceDocs, meta: Metamodel, ref: ElementRef, parent: ElementRef, before: ElementRef | null): ElementRef {
  if (parent.key !== ref.key) throw new Error('Objects can only be moved within their own file.')
  const doc = d.doc(ref.key)!
  const el = elementOf(d, ref)
  const container = elementOf(d, parent)
  if (el === container || el.contains(container)) return ref
  const cls = classOf(meta, el)
  const parentClass = classOf(meta, container)
  const feature = parentClass?.features.find((f) => f.name === el.localName)
  if (!cls || !parentClass || !feature?.containment || !conforms(meta, cls.id, feature.typeId)) {
    throw new Error(`${cls?.name ?? 'That object'} can't go there.`)
  }
  const anchor = before ? elementOf(d, before) : insertionPoint(container, parentClass, feature)
  withRefactor(meta, doc, () => {
    moveElement(el, container, anchor === el ? el.nextElementSibling : anchor)
    setObjectType(doc, el, cls, feature)
  })
  return { key: ref.key, path: pathOf(el) }
}

/** Copies an object, with everything it contains, just after the original. IDs are cleared so they do not clash. */
export function duplicateObject(d: InstanceDocs, meta: Metamodel, ref: ElementRef): ElementRef {
  const doc = d.doc(ref.key)!
  const el = elementOf(d, ref)
  const copy = el.cloneNode(true) as Element
  const clear = (original: Element, clone: Element) => {
    const id = classOf(meta, original)?.features.find((f) => f.isId)
    if (id) clone.removeAttribute(id.name)
    const originals = childObjects(meta, original)
    const clones = Array.from(clone.children).filter((c) => originals.some((o) => o.localName === c.localName))
    originals.forEach((o, i) => clones[i] && clear(o, clones[i]))
  }
  clear(el, copy)
  withRefactor(meta, doc, () => {
    if (isRoot(el)) {
      wrapRoots(doc)
      // The copy was taken before wrapping, so it still carries the declarations that moved to the wrapper.
      for (const attr of Array.from(copy.attributes)) if (movesToWrapper(attr)) copy.removeAttributeNode(attr)
    }
    insertChild(el.parentElement!, copy, el.nextElementSibling)
  })
  return { key: ref.key, path: pathOf(copy) }
}

/** The namespace declarations and file-level attributes that belong on the outermost element. */
const movesToWrapper = (attr: Attr) =>
  attr.namespaceURI === XMLNS_NS ||
  (attr.namespaceURI === XMI_NS && attr.localName === 'version') ||
  (attr.namespaceURI === XSI_NS && attr.localName === 'schemaLocation')

function moveFileAttributes(from: Element, to: Element) {
  for (const attr of Array.from(from.attributes)) {
    if (!movesToWrapper(attr)) continue
    from.removeAttributeNode(attr)
    to.setAttributeNS(attr.namespaceURI, attr.name, attr.value)
  }
}

/**
 * Puts a single root object inside an `xmi:XMI` element, so the file can hold more than one root, as EMF
 * writes a resource with several. The namespace declarations move up with it.
 */
function wrapRoots(doc: Document) {
  const root = doc.documentElement
  if (root.localName === 'XMI' && root.namespaceURI === XMI_NS) return
  const wrapper = doc.createElementNS(XMI_NS, `${root.lookupPrefix(XMI_NS) ?? 'xmi'}:XMI`)
  moveFileAttributes(root, wrapper)
  if (!wrapper.getAttributeNS(XMI_NS, 'version')) wrapper.setAttributeNS(XMI_NS, `${wrapper.prefix}:version`, '2.0')
  if (!wrapper.lookupNamespaceURI(wrapper.prefix)) wrapper.setAttributeNS(XMLNS_NS, `xmlns:${wrapper.prefix}`, XMI_NS)
  doc.replaceChild(wrapper, root)
  insertChild(wrapper, root, null)
  reindent(root, '', '  ')
}

/** Undoes {@link wrapRoots} once only one root is left, so the file is as EMF would write it. */
function unwrapRoots(doc: Document) {
  const wrapper = doc.documentElement
  const roots = rootObjects(doc)
  if (wrapper.localName !== 'XMI' || roots.length !== 1) return
  const root = roots[0]!
  const from = indentOf(root)
  moveFileAttributes(wrapper, root)
  removeElement(root)
  doc.replaceChild(root, wrapper)
  reindent(root, from, '')
}

/** Adds a new root object of class `cls` to a file, next to the roots already there, and returns where it is. */
export function createRootObject(d: InstanceDocs, meta: Metamodel, key: string, cls: MetaClass): ElementRef {
  const doc = d.doc(key)
  if (!doc) throw new Error('That file is no longer open.')
  if (cls.abstract) throw new Error(`${cls.name} is abstract.`)
  let el!: Element
  withRefactor(meta, doc, () => {
    wrapRoots(doc)
    const wrapper = doc.documentElement
    el = doc.createElementNS(cls.nsURI, `${prefixFor(doc, cls)}:${cls.name}`)
    nameNew(meta, doc, el, cls)
    insertChild(wrapper, el, null)
  })
  return { key, path: pathOf(el) }
}

/**
 * Adds an object of class `cls` wherever it fits in a file, for a reference to point at: the first containment
 * with room that takes it, else a new root.
 */
export function createObjectAnywhere(d: InstanceDocs, meta: Metamodel, key: string, cls: MetaClass): ElementRef {
  const doc = d.doc(key)
  if (!doc) throw new Error('That file is no longer open.')
  for (const holder of allObjects(meta, doc)) {
    const holderClass = classOf(meta, holder)
    const feature = holderClass?.features.find(
      (f) =>
        f.containment &&
        !f.readOnly &&
        conforms(meta, cls.id, f.typeId) &&
        (f.upper < 0 || Array.from(holder.children).filter((c) => c.localName === f.name).length < f.upper),
    )
    if (feature) return createObject(d, meta, { key, path: pathOf(holder) }, feature.name, cls)
  }
  return createRootObject(d, meta, key, cls)
}

/** Sets a single-valued attribute, or unsets it with null. */
export function setValue(d: InstanceDocs, ref: ElementRef, feature: MetaFeature, value: string | null) {
  const el = elementOf(d, ref)
  if (value === null) el.removeAttribute(feature.name)
  else el.setAttribute(feature.name, value)
}

/** Replaces a many-valued attribute's values, written as one child element each. */
export function setValues(d: InstanceDocs, meta: Metamodel, ref: ElementRef, feature: MetaFeature, values: string[]) {
  const doc = d.doc(ref.key)!
  const el = elementOf(d, ref)
  const cls = classOf(meta, el)
  if (!cls) return
  for (const old of Array.from(el.children).filter((c) => c.localName === feature.name)) removeElement(old)
  const anchor = insertionPoint(el, cls, feature)
  for (const value of values) {
    const item = createElement(doc, feature.name)
    item.textContent = value
    insertChild(el, item, anchor)
  }
}

/** Points a non-containment reference at the given objects (in this file), or clears it. */
export function setReferences(d: InstanceDocs, meta: Metamodel, ref: ElementRef, feature: MetaFeature, targets: ElementRef[]) {
  const doc = d.doc(ref.key)!
  const el = elementOf(d, ref)
  const fragments = targets.map((t) => fragmentOf(meta, elementAt(doc, t.path)!))
  if (fragments.length) el.setAttribute(feature.name, fragments.join(' '))
  else el.removeAttribute(feature.name)
}

/** A new instance file's text: one root object of class `cls`, linked to its metamodel by namespace. */
export function newInstanceText(cls: MetaClass, metamodelPath: string, name: string | null = null): string {
  const prefix = cls.nsPrefix
  const nameAttr = name ? ` name="${name.replace(/[&"<]/g, '')}"` : ''
  return `<?xml version="1.0" encoding="UTF-8"?>
<${prefix}:${cls.name} xmi:version="2.0" xmlns:xmi="${XMI_NS}" xmlns:xsi="${XSI_NS}"
    xmlns:${prefix}="${cls.nsURI}" xsi:schemaLocation="${cls.nsURI} ${metamodelPath}"${nameAttr}/>
`
}
