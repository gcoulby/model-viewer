interface Rng {
  next: () => number
  int: (lo: number, hi: number) => number
}

type Node =
  | { t: 'chars'; set: string }
  | { t: 'seq'; items: Node[] }
  | { t: 'alt'; options: Node[] }
  | { t: 'repeat'; node: Node; min: number; max: number }

const DIGITS = '0123456789'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const UPPER = LOWER.toUpperCase()
const WORD = `${LOWER}${UPPER}${DIGITS}_`
/** What `.` and negated classes draw from: readable characters. */
const ANY = `${LOWER}${UPPER}${DIGITS}`

function escapeSet(c: string): string {
  if (c === 'd') return DIGITS
  if (c === 'w') return WORD
  if (c === 's') return ' '
  if (c === 'D') return LOWER
  if (c === 'W') return '-'
  if (c === 'S') return LOWER
  if (c === 'n') return '\n'
  if (c === 't') return '\t'
  return c
}

/**
 * Makes a string that matches a regular expression, for the common subset patterns use: literals, escapes,
 * classes with ranges, groups with alternatives, and quantifiers. Returns null for anything beyond that
 * (look-arounds, back-references), so the caller can fall back to another value.
 */
export function sampleRegex(source: string, rng: Rng): string | null {
  let i = 0
  const peek = () => source[i]

  const parseClass = (): Node => {
    i++ // [
    let negate = false
    if (peek() === '^') {
      negate = true
      i++
    }
    let set = ''
    let first = true
    while (i < source.length && (peek() !== ']' || first)) {
      first = false
      let c = source[i++]!
      if (c === '\\') c = escapeSet(source[i++] ?? '')
      if (c.length === 1 && peek() === '-' && source[i + 1] && source[i + 1] !== ']') {
        i++
        let end = source[i++]!
        if (end === '\\') end = source[i++] ?? end
        for (let code = c.charCodeAt(0); code <= end.charCodeAt(0); code++) set += String.fromCharCode(code)
      } else set += c
    }
    if (peek() !== ']') throw new Error('unclosed class')
    i++
    if (negate) set = [...ANY].filter((ch) => !set.includes(ch)).join('')
    if (!set) throw new Error('empty class')
    return { t: 'chars', set }
  }

  const parseAtom = (): Node => {
    const c = peek()!
    if (c === '(') {
      i++
      if (peek() === '?') {
        if (source[i + 1] !== ':') throw new Error('unsupported group')
        i += 2
      }
      const inner = parseAlt()
      if (peek() !== ')') throw new Error('unclosed group')
      i++
      return inner
    }
    if (c === '[') return parseClass()
    if (c === '.') {
      i++
      return { t: 'chars', set: ANY }
    }
    if (c === '\\') {
      i++
      const e = source[i++] ?? ''
      if (/[1-9bBk]/.test(e)) throw new Error('unsupported escape')
      return { t: 'chars', set: escapeSet(e) }
    }
    i++
    return { t: 'chars', set: c }
  }

  const parseRepeat = (node: Node): Node => {
    const c = peek()
    let min = 1
    let max = 1
    if (c === '?') [min, max] = [0, 1]
    else if (c === '*') [min, max] = [0, 3]
    else if (c === '+') [min, max] = [1, 4]
    else if (c === '{') {
      const m = /^\{(\d+)(,(\d*))?\}/.exec(source.slice(i))
      if (!m) return node
      min = Number(m[1])
      max = m[2] ? (m[3] ? Number(m[3]) : min + 3) : min
      i += m[0].length - 1
    } else return node
    i++
    if (peek() === '?' || peek() === '+') i++ // lazy or possessive: the same strings
    return { t: 'repeat', node, min, max }
  }

  const parseSeq = (): Node => {
    const items: Node[] = []
    while (i < source.length && peek() !== '|' && peek() !== ')') {
      if (peek() === '^' || peek() === '$') {
        i++
        continue
      }
      items.push(parseRepeat(parseAtom()))
    }
    return { t: 'seq', items }
  }

  const parseAlt = (): Node => {
    const options = [parseSeq()]
    while (peek() === '|') {
      i++
      options.push(parseSeq())
    }
    return options.length === 1 ? options[0]! : { t: 'alt', options }
  }

  const emit = (node: Node): string => {
    switch (node.t) {
      case 'chars':
        return node.set[Math.floor(rng.next() * node.set.length)]!
      case 'seq':
        return node.items.map(emit).join('')
      case 'alt':
        return emit(node.options[Math.floor(rng.next() * node.options.length)]!)
      case 'repeat': {
        let out = ''
        for (let n = rng.int(node.min, node.max); n > 0; n--) out += emit(node.node)
        return out
      }
    }
  }

  try {
    const tree = parseAlt()
    if (i < source.length) return null
    return emit(tree)
  } catch {
    return null
  }
}
