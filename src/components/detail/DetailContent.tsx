import { ECORE_BUILTIN_SOURCE } from '@/lib/ecore/buildGraph'
import { inheritedSources, usedBy } from '@/lib/ecore/detail'
import { attributeRow, operationRow, referenceRow } from '@/lib/ecore/format'
import type { GraphNode, ModelGraph } from '@/types/graph'
import { ClassifierChips } from './ClassifierChips'
import { DetailHeader } from './DetailHeader'
import { DetailSection } from './DetailSection'
import { FeatureList } from './FeatureList'
import { InheritedFeatures } from './InheritedFeatures'

interface DetailContentProps {
  graph: ModelGraph
  node: GraphNode
  onClose: () => void
}

export function DetailContent({ graph, node, onClose }: DetailContentProps) {
  const lookup = (ids: string[]) =>
    ids.flatMap((id) => {
      const found = graph.nodes.get(id)
      return found ? [found] : []
    })
  const supertypes = lookup(node.superIds)
  const subtypes = lookup(node.subIds)
  const users = usedBy(graph, node)
  const inherited = node.kind === 'class' ? inheritedSources(graph, node) : []

  return (
    <div>
      <DetailHeader node={node} onClose={onClose} />
      {node.kind === 'external' && (
        <p className="mt-3.5 text-[12.5px] text-muted-foreground">
          {node.source === ECORE_BUILTIN_SOURCE
            ? 'This type comes from the Ecore package itself.'
            : `Defined in ${node.source}, which has not been loaded. Open that file as well to see the real class.`}
        </p>
      )}
      {supertypes.length > 0 && (
        <DetailSection title="Supertypes" count={supertypes.length}>
          <ClassifierChips nodes={supertypes} />
        </DetailSection>
      )}
      {subtypes.length > 0 && (
        <DetailSection title="Subtypes" count={subtypes.length}>
          <ClassifierChips nodes={subtypes} />
        </DetailSection>
      )}
      {node.kind === 'class' && (
        <>
          {node.attributes.length > 0 && (
            <DetailSection title="Attributes" count={node.attributes.length}>
              <FeatureList rows={node.attributes.map(attributeRow)} />
            </DetailSection>
          )}
          {node.references.length > 0 && (
            <DetailSection title="References" count={node.references.length}>
              <FeatureList rows={node.references.map(referenceRow)} />
            </DetailSection>
          )}
          {node.operations.length > 0 && (
            <DetailSection title="Operations" count={node.operations.length}>
              <FeatureList rows={node.operations.map(operationRow)} />
            </DetailSection>
          )}
          {inherited.length > 0 && <InheritedFeatures sources={inherited} />}
        </>
      )}
      {node.kind === 'enum' && (
        <DetailSection title="Literals" count={node.literals.length}>
          <FeatureList rows={node.literals.map((l) => `${l.name} = ${l.value}`)} />
        </DetailSection>
      )}
      {node.kind === 'datatype' && node.instanceClassName && (
        <DetailSection title="Instance class">
          <FeatureList rows={[node.instanceClassName]} />
        </DetailSection>
      )}
      {users.length > 0 && (
        <DetailSection title="Used by" count={users.length}>
          <ClassifierChips nodes={users} />
        </DetailSection>
      )}
    </div>
  )
}
