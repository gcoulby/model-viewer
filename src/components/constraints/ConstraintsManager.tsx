import { ListChecksIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ClassifierIcon } from '@/components/sidebar/ClassifierIcon'
import { IconAction } from '@/components/topbar/IconAction'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useModels } from '@/hooks/useModels'
import { CONSTRAINT_LABELS, type ConstraintKey } from '@/lib/constraints'
import { elementForPath } from '@/lib/ecore/edit/refs'
import { buildMetamodel, type MetaClass, type MetaFeature, type Metamodel } from '@/lib/instance/metamodel'
import { cn } from '@/lib/utils'
import { ConstraintFields } from './ConstraintFields'

const ALL = '__constrained__'
const ownFeatures = (cls: MetaClass) => cls.features.filter((f) => f.declaredIn === cls.id && !f.container && !f.readOnly)
const isConstrained = (f: MetaFeature) => Object.values(f.parsed.constraints).some((v) => v?.trim())

/** The top bar's Constraints button, which opens the manager. */
export function ConstraintsButton() {
  const [open, setOpen] = useState(false)
  const { models } = useModels()
  return (
    <>
      <IconAction label="Constraints" disabled={!models.length} onClick={() => setOpen(true)}>
        <ListChecksIcon />
      </IconAction>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[min(720px,88dvh)] flex-col gap-0 p-0 sm:max-w-4xl">{open && <ConstraintsManager />}</DialogContent>
      </Dialog>
    </>
  )
}

/** Every class's features with their constraints, to review and edit in one place. */
function ConstraintsManager() {
  const { models } = useModels()
  const meta = useMemo(() => buildMetamodel(models), [models])
  const classes = useMemo(
    () => [...meta.classes.values()].filter((c) => ownFeatures(c).length).sort((a, b) => a.name.localeCompare(b.name)),
    [meta],
  )
  const constrained = classes.flatMap((c) => ownFeatures(c).filter(isConstrained).map((f) => ({ cls: c, f })))
  const [picked, setPicked] = useState<string>(constrained.length ? ALL : (classes[0]?.id ?? ALL))
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const shownClasses = classes.filter((c) => !needle || c.name.toLowerCase().includes(needle) || ownFeatures(c).some((f) => f.name.toLowerCase().includes(needle)))
  const selected = picked === ALL ? null : meta.classes.get(picked)
  const rows = selected ? ownFeatures(selected).map((f) => ({ cls: selected, f })) : constrained

  return (
    <>
      <DialogHeader className="border-b px-5 pt-4 pb-3">
        <DialogTitle>Constraints</DialogTitle>
        <DialogDescription className="text-[12.5px]">
          Rules on feature values: ranges, counts, allowed values and patterns. Problems checks instances against them, and Generate instance follows them. They're saved in each .ecore as an annotation on the feature.
        </DialogDescription>
      </DialogHeader>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(180px,240px)_1fr]">
        <div className="flex min-h-0 flex-col border-r">
          <div className="p-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a class or feature" className="h-8 text-[12.5px]" />
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="grid gap-px px-1.5 pb-2">
              <ClassButton active={picked === ALL} onClick={() => setPicked(ALL)} count={constrained.length}>
                <span className="font-medium">All constrained</span>
              </ClassButton>
              <div className="my-1 border-t" />
              {shownClasses.map((c) => (
                <ClassButton key={c.id} active={picked === c.id} onClick={() => setPicked(c.id)} count={ownFeatures(c).filter(isConstrained).length}>
                  <ClassIcon meta={meta} cls={c} />
                  <span className="truncate">{c.name}</span>
                </ClassButton>
              ))}
            </div>
          </ScrollArea>
        </div>
        <ScrollArea className="min-h-0">
          <div className="grid gap-3 p-4">
            {!rows.length && (
              <p className="text-[12.5px] text-muted-foreground">
                {picked === ALL ? 'No constraints yet. Pick a class on the left to add some to its features.' : 'This class has no features of its own to constrain.'}
              </p>
            )}
            {rows.map(({ cls, f }) => (
              <FeatureCard key={`${cls.id}|${f.name}`} meta={meta} cls={cls} f={f} showClass={picked === ALL} />
            ))}
          </div>
        </ScrollArea>
      </div>
    </>
  )
}

function ClassButton({ active, onClick, count, children }: { active: boolean; onClick: () => void; count: number; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-left text-[13px] hover:bg-muted',
        active && 'bg-tint shadow-[inset_2px_0_0_var(--primary)] hover:bg-tint',
      )}
    >
      {children}
      <span className="flex-1" />
      {count > 0 && <span className="rounded bg-muted px-1 font-mono text-[11px] text-muted-foreground">{count}</span>}
    </button>
  )
}

function ClassIcon({ meta, cls }: { meta: Metamodel; cls: MetaClass }) {
  const node = meta.graph.nodes.get(cls.id)
  return node ? <ClassifierIcon node={node} /> : null
}

function FeatureCard({ meta, cls, f, showClass }: { meta: Metamodel; cls: MetaClass; f: MetaFeature; showClass: boolean }) {
  const bounds = f.many ? ` [${f.lower}..${f.upper < 0 ? '*' : f.upper}]` : f.lower > 0 ? ' [1]' : ''
  const set = (Object.keys(f.parsed.constraints) as ConstraintKey[]).filter((k) => f.parsed.constraints[k]?.trim())
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2.5 flex min-w-0 items-baseline gap-1.5">
        {showClass && (
          <>
            <ClassIcon meta={meta} cls={cls} />
            <span className="text-muted-foreground">{cls.name}.</span>
          </>
        )}
        <span className="font-medium">{f.name}</span>
        <span className="truncate font-mono text-[11.5px] text-muted-foreground">
          {f.typeName}
          {bounds}
          {f.containment && ' · containment'}
        </span>
        <span className="flex-1" />
        {set.length > 0 && <span className="truncate text-xs text-muted-foreground">{set.map((k) => CONSTRAINT_LABELS[k].toLowerCase()).join(', ')}</span>}
      </div>
      <ConstraintFields
        fileKey={cls.fileKey}
        locate={(doc) => elementForPath(doc, f.parsed.path)}
        featureId={f.parsed.path}
        target={f}
        details={f.parsed.constraints}
        literals={f.literals}
      />
    </div>
  )
}
