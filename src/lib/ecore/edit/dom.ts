import { ECORE_NS, XMLNS_NS, XSI_NS } from './kinds'

/**
 * Where an element sits in a file: the indexes of its element ancestors from the document element down.
 * A rename leaves it unchanged; an insert or delete before it shifts it, so edits report where things end up.
 */
export interface ElementRef {
  key: string
  path: number[]
}

export const refId = (ref: ElementRef) => `${ref.key}#${ref.path.join('/')}`

export const sameRef = (a: ElementRef | null, b: ElementRef | null) =>
  !!a && !!b && a.key === b.key && a.path.length === b.path.length && a.path.every((n, i) => n === b.path[i])

export function elementAt(doc: Document, path: number[]): Element | null {
  let el: Element | null = doc.documentElement
  for (const index of path) {
    el = el?.children[index] ?? null
    if (!el) return null
  }
  return el
}

export function pathOf(el: Element): number[] {
  const path: number[] = []
  let current: Element = el
  while (current.parentElement) {
    path.unshift(Array.prototype.indexOf.call(current.parentElement.children, current))
    current = current.parentElement
  }
  return path
}

/** The nearest element that still exists along `path`, for a selection that an undo took away. */
export function nearestAt(doc: Document, path: number[]): { el: Element; path: number[] } {
  for (let n = path.length; n >= 0; n--) {
    const el = elementAt(doc, path.slice(0, n))
    if (el) return { el, path: path.slice(0, n) }
  }
  return { el: doc.documentElement, path: [] }
}

const isBlank = (node: Node) => node.nodeType === Node.TEXT_NODE && !(node.textContent ?? '').trim()

/** The whitespace an element is indented by on its line. */
export function indentOf(el: Element): string {
  const before = el.previousSibling
  if (!before || before.nodeType !== Node.TEXT_NODE) return ''
  const text = before.textContent ?? ''
  const newline = text.lastIndexOf('\n')
  if (newline < 0) return ''
  const indent = text.slice(newline + 1)
  return indent.trim() ? '' : indent
}

/** Shifts the indentation of every line inside `el` from `from` to `to`, after a move to a new depth. */
function reindent(el: Element, from: string, to: string) {
  if (from === to) return
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? ''
    if (!text.includes('\n') || text.trim()) continue
    node.textContent = text
      .split('\n')
      .map((line, i) => (i === 0 ? line : line.startsWith(from) ? to + line.slice(from.length) : line))
      .join('\n')
  }
}

/** Inserts `child` before `before` (or last), indented like its siblings so the file reads as Eclipse writes it. */
export function insertChild(parent: Element, child: Element, before: Element | null) {
  const doc = parent.ownerDocument
  const siblings = Array.from(parent.children)
  const parentIndent = indentOf(parent)
  const first = siblings[0]
  const indent = first ? indentOf(first) || `${parentIndent}  ` : `${parentIndent}  `
  if (!first) {
    for (const node of Array.from(parent.childNodes)) if (isBlank(node)) node.remove()
    parent.append(doc.createTextNode(`\n${parentIndent}`))
  }
  if (before) {
    parent.insertBefore(child, before)
    parent.insertBefore(doc.createTextNode(`\n${indent}`), before)
  } else {
    const last = parent.lastChild
    const anchor = last && isBlank(last) ? last : null
    parent.insertBefore(doc.createTextNode(`\n${indent}`), anchor)
    parent.insertBefore(child, anchor)
  }
}

/** Removes an element with the line it was on; a parent left empty closes up into `<tag/>`. */
export function removeElement(el: Element) {
  const parent = el.parentElement
  const before = el.previousSibling
  if (before && isBlank(before)) before.remove()
  el.remove()
  if (parent && !parent.children.length) {
    for (const node of Array.from(parent.childNodes)) if (isBlank(node)) node.remove()
  }
}

/** Moves an element, re-indenting its contents for its new depth. */
export function moveElement(el: Element, parent: Element, before: Element | null) {
  const from = indentOf(el)
  removeElement(el)
  insertChild(parent, el, before)
  reindent(el, from, indentOf(el))
}

export function setAttr(el: Element, name: string, value: string | null) {
  if (value === null) el.removeAttribute(name)
  else el.setAttribute(name, value)
}

/** Makes sure the document declares the `xsi` and `ecore` prefixes that new elements use. */
export function ensureNamespaces(doc: Document) {
  const root = doc.documentElement
  if (!root.lookupNamespaceURI('xsi')) root.setAttributeNS(XMLNS_NS, 'xmlns:xsi', XSI_NS)
  if (!root.lookupNamespaceURI('ecore')) root.setAttributeNS(XMLNS_NS, 'xmlns:ecore', ECORE_NS)
}

/** A new, unqualified element as Ecore writes its contents, with an `xsi:type` when given. */
export function createElement(doc: Document, tag: string, xsiType?: string): Element {
  const el = doc.createElementNS(null, tag)
  if (xsiType) {
    ensureNamespaces(doc)
    el.setAttributeNS(XSI_NS, 'xsi:type', `ecore:${xsiType}`)
  }
  return el
}
