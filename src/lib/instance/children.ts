import { concreteFamily, type MetaClass, type MetaFeature, type Metamodel } from './metamodel'
import { classOf } from './xmi'

/** The containment features of an object that can take another value, each with the classes it accepts. */
export function addableChildren(meta: Metamodel, el: Element): { feature: MetaFeature; classes: MetaClass[] }[] {
  const cls = classOf(meta, el)
  if (!cls) return []
  return cls.features.flatMap((feature) => {
    if (!feature.containment || feature.readOnly) return []
    const count = Array.from(el.children).filter((c) => c.localName === feature.name).length
    if (feature.upper > 0 && count >= feature.upper) return []
    const classes = concreteFamily(meta, feature.typeId)
    return classes.length ? [{ feature, classes }] : []
  })
}
