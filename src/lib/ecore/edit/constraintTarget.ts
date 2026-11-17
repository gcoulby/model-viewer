import { valueKindOf, type ConstraintTarget } from '@/lib/constraints'
import { tokenName } from './labels'
import { resolveToken, type RefFile } from './refs'

/** A feature's type token: its eType, or the classifier of its generic type. */
const typeTokenOf = (el: Element) =>
  el.getAttribute('eType') ?? Array.from(el.children).find((c) => c.localName === 'eGenericType')?.getAttribute('eClassifier') ?? ''

/** The shape of an attribute or reference element, and its enum's literals, for its constraint fields. */
export function constraintTargetOf(el: Element, file: RefFile, files: RefFile[], docs: ReadonlyMap<string, Document>) {
  const token = typeTokenOf(el)
  const type = token ? resolveToken(file, token, files, (key) => docs.get(key) ?? null) : null
  const isEnum = type?.el.getAttribute('xsi:type') === 'ecore:EEnum'
  const upper = Number(el.getAttribute('upperBound') ?? 1)
  const target: ConstraintTarget = {
    kind: el.getAttribute('xsi:type') === 'ecore:EReference' ? 'reference' : 'attribute',
    many: upper < 0 || upper > 1,
    valueKind: valueKindOf(token ? tokenName(token) : '', isEnum),
  }
  const literals = isEnum ? Array.from(type!.el.children).filter((c) => c.localName === 'eLiterals').map((c) => c.getAttribute('name') ?? '') : []
  return { target, literals }
}
