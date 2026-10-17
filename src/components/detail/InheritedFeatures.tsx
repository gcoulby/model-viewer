import { ChevronRightIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { attributeRow, referenceRow } from '@/lib/ecore/format'
import type { ClassGraphNode } from '@/types/graph'
import { FeatureList } from './FeatureList'

export function InheritedFeatures({ sources }: { sources: ClassGraphNode[] }) {
  const total = sources.reduce((sum, s) => sum + s.attributes.length + s.references.length, 0)
  return (
    <Collapsible className="mt-3.5">
      <CollapsibleTrigger className="group/trigger flex items-center gap-1 text-[13px] font-semibold">
        <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-data-[panel-open]/trigger:rotate-90" />
        Inherited features
        <small className="font-normal text-muted-foreground">{total}</small>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {sources.map((source) => (
          <div key={source.id}>
            <span className="mt-1.5 block text-[11.5px] text-muted-foreground">from {source.name}</span>
            <FeatureList rows={[...source.attributes.map(attributeRow), ...source.references.map(referenceRow)]} />
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
