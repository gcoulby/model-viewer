const DECLARATION = /^\s*<\?xml[^?]*\?>/

export function parseXml(text: string): XMLDocument {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('This file is not valid XML.')
  return doc
}

/**
 * The document as text. Browsers leave out the `<?xml …?>` declaration, so the one the original text had is
 * put back, keeping files the same shape as Eclipse writes them.
 */
export function serializeXml(doc: XMLDocument, original: string): string {
  let text = new XMLSerializer().serializeToString(doc)
  const declaration = original.match(DECLARATION)?.[0].trim()
  if (declaration && !DECLARATION.test(text)) text = `${declaration}\n${text}`
  if (original.endsWith('\n') && !text.endsWith('\n')) text += '\n'
  return text
}
