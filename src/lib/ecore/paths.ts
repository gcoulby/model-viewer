const SCHEME = /^[a-z][a-z0-9+.-]+:/i

/** Collapses `.` and `..` segments. Leading `..` segments that climb out of the root are kept. */
export function normalisePath(path: string): string {
  const out: string[] = []
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..' && out.length && out[out.length - 1] !== '..') out.pop()
    else out.push(part)
  }
  return out.join('/')
}

export function dirOf(path: string): string {
  const i = path.lastIndexOf('/')
  return i < 0 ? '' : path.slice(0, i)
}

export function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

/** True for `http:`, `platform:`, `file:` and similar; false for relative paths and `C:\` drive letters. */
export function hasScheme(uri: string): boolean {
  return SCHEME.test(uri)
}

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

/** The path part of a relative, `file:` or `platform:/resource/` URI, with `.`/`..` collapsed. */
export function uriPath(uri: string): string {
  const stripped = uri.replace(/^(file:|platform:\/(resource|plugin))\/*/i, '')
  return normalisePath(safeDecode(hasScheme(stripped) ? '' : stripped))
}

/** A relative URI seen from the file at `fromDir`, as a path from the opened root. */
export function resolveRelative(fromDir: string, uri: string): string {
  return normalisePath(`${fromDir}/${safeDecode(uri)}`)
}

export function pathSegments(path: string): string[] {
  return path.split('/').filter((s) => s && s !== '..' && s !== '.')
}
