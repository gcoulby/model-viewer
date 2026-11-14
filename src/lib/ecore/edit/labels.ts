import { kindOf } from './kinds'
import { refTokens, splitToken } from './refs'

/** The name at the end of a reference token: `#//Book` and `…Ecore#//EString` read as Book and EString. */
export function tokenName(token: string): string {
  const { fragment } = splitToken(token)
  return fragment.split('/').filter(Boolean).pop() ?? fragment
}

function genericLabel(el: Element): string {
  const classifier = el.getAttribute('eClassifier')
  const parameter = el.getAttribute('eTypeParameter')
  const kids = Array.from(el.children)
  const args = kids.filter((c) => c.localName === 'eTypeArguments')
  let base = classifier ? tokenName(classifier) : parameter ? tokenName(parameter) : '?'
  if (!classifier && !parameter) {
    const upper = kids.find((c) => c.localName === 'eUpperBound')
    const lower = kids.find((c) => c.localName === 'eLowerBound')
    if (upper) base = `? extends ${genericLabel(upper)}`
    else if (lower) base = `? super ${genericLabel(lower)}`
  }
  return args.length ? `${base}<${args.map(genericLabel).join(', ')}>` : base
}

/** The type of a typed element as text, generics included, or '' when it has none. */
export function typeLabel(el: Element): string {
  const generic = Array.from(el.children).find((c) => c.localName === 'eGenericType')
  if (generic) return genericLabel(generic)
  const [token] = refTokens(el.getAttribute('eType'))
  return token ? tokenName(token) : ''
}

export function multiplicityLabel(el: Element): string {
  const lower = el.getAttribute('lowerBound') ?? '0'
  const upper = el.getAttribute('upperBound') ?? '1'
  if (lower === '0' && upper === '1') return ''
  const u = upper === '-1' ? '*' : upper === '-2' ? '?' : upper
  return lower === u ? `[${u}]` : `[${lower}..${u}]`
}

/** A tree row's text: the element's name and, muted beside it, what Eclipse's editor shows after the name. */
export function rowLabel(el: Element): { name: string; detail: string } {
  const kind = kindOf(el)
  const name = el.getAttribute('name') ?? ''
  switch (kind) {
    case 'EPackage':
    case 'EEnum':
    case 'ETypeParameter':
      return { name, detail: '' }
    case 'EClass': {
      const supers = refTokens(el.getAttribute('eSuperTypes')).map(tokenName)
      return { name, detail: supers.length ? `→ ${supers.join(', ')}` : '' }
    }
    case 'EDataType':
      return { name, detail: el.getAttribute('instanceClassName') ?? '' }
    case 'EEnumLiteral':
      return { name, detail: el.hasAttribute('value') ? `= ${el.getAttribute('value')}` : '' }
    case 'EAttribute':
    case 'EReference':
    case 'EParameter': {
      const type = typeLabel(el)
      return { name, detail: [type && `: ${type}`, multiplicityLabel(el)].filter(Boolean).join(' ') }
    }
    case 'EOperation': {
      const params = Array.from(el.children)
        .filter((c) => c.localName === 'eParameters')
        .map((p) => typeLabel(p) || '?')
      const type = typeLabel(el)
      return { name, detail: `(${params.join(', ')})${type ? ` : ${type}` : ''}` }
    }
    case 'EAnnotation':
      return { name: el.getAttribute('source') ?? '', detail: '' }
    case 'EStringToStringMapEntry':
      return { name: el.getAttribute('key') ?? '', detail: `→ ${el.getAttribute('value') ?? ''}` }
    case 'EGenericType':
      return { name: genericLabel(el), detail: el.localName.replace(/^eGeneric|^e/, '') }
    default:
      return { name: el.localName, detail: '' }
  }
}
