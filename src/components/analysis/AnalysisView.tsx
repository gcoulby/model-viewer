import { ArrowDownIcon, ArrowUpIcon, CircleAlertIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ClassifierIcon } from '@/components/sidebar/ClassifierIcon'
import { OpenFilesButton } from '@/components/topbar/OpenFilesButton'
import { Input } from '@/components/ui/input'
import { useAnalysis } from '@/hooks/useAnalysis'
import { useEditorMode } from '@/hooks/useEditorMode'
import { useEditTarget } from '@/hooks/useEditTarget'
import { useWorkspaceDocs } from '@/hooks/useWorkspaceDocs'
import { FEATURE_BUCKETS, type ClassRow, type Finding, type Report } from '@/lib/analysis/analyze'
import { pathOf } from '@/lib/ecore/edit/dom'
import { elementForPath } from '@/lib/ecore/edit/refs'
import type { Metamodel } from '@/lib/instance/metamodel'
import { cn } from '@/lib/utils'

const SEVERITY = {
  error: { label: 'Error', icon: CircleAlertIcon, className: 'text-destructive' },
  warning: { label: 'Warning', icon: TriangleAlertIcon, className: 'text-warning' },
  info: { label: 'Note', icon: InfoIcon, className: 'text-muted-foreground' },
} as const

/** Opens a classifier from the report in Edit mode, targeted in the tree and Properties. */
function useOpenInEditor(meta: Metamodel) {
  const docs = useWorkspaceDocs()
  const { setMode } = useEditorMode()
  const { setTarget } = useEditTarget()
  return (nodeId: string) => {
    const node = meta.graph.nodes.get(nodeId)
    if (!node || !('package' in node)) return
    const doc = docs.get(node.package.fileKey)
    const el = doc && elementForPath(doc, nodeId.slice(nodeId.indexOf('|') + 1))
    if (!el) return
    setMode('edit')
    setTarget({ key: node.package.fileKey, path: pathOf(el) }, { center: true })
  }
}

/** Analysis mode: the open metamodels measured, with findings, distributions and a table of classes. */
export function AnalysisView() {
  const analysis = useAnalysis()
  if (!analysis) {
    return (
      <main className="grid min-h-0 flex-1 place-items-center p-6 text-center">
        <div className="grid max-w-sm justify-items-center gap-3">
          <h1 className="text-lg font-semibold">Nothing to analyse yet</h1>
          <p className="text-[13px] text-muted-foreground">Open one or more .ecore files to see their size, structure and anything worth a second look.</p>
          <OpenFilesButton />
        </div>
      </main>
    )
  }
  return <Analysis meta={analysis.meta} report={analysis.report} />
}

function Analysis({ meta, report }: { meta: Metamodel; report: Report }) {
  const open = useOpenInEditor(meta)
  const s = report.summary
  const counts = { error: 0, warning: 0, info: 0 }
  for (const f of report.findings) counts[f.severity]++

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 md:px-8">
        <header>
          <h1 className="text-xl font-semibold">Metamodel analysis</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {report.files.join(', ')} · {report.findings.length ? `${report.findings.length} findings` : 'nothing to report'}
          </p>
        </header>

        <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Classes" value={s.classes} detail={`${s.abstractClasses} abstract · ${s.interfaces} interfaces`} />
          <Stat label="Attributes" value={s.attributes} detail={`${s.constrainedFeatures} constrained features`} />
          <Stat label="References" value={s.references} detail={`${s.containments} containment · ${s.bidirectional} two-way`} />
          <Stat label="Enums & data types" value={s.enums + s.dataTypes} detail={`${s.enums} enums · ${s.dataTypes} data types`} />
          <Stat label="Operations" value={s.operations} detail={`${s.packages} package${s.packages === 1 ? '' : 's'}`} />
          <Stat
            label="Validation"
            value={s.errors + s.warnings}
            detail={
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex items-center gap-0.5">
                  <CircleAlertIcon className="size-3 text-destructive" />
                  {s.errors} errors
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <TriangleAlertIcon className="size-3 text-warning" />
                  {s.warnings} warnings
                </span>
              </span>
            }
          />
        </section>

        <section aria-labelledby="findings">
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id="findings" className="text-[15px] font-semibold">
              Findings
            </h2>
            <span className="text-[12.5px] text-muted-foreground">
              {counts.error} errors · {counts.warning} warnings · {counts.info} notes
            </span>
          </div>
          {report.findings.length ? (
            <div className="grid gap-2.5">
              {report.findings.map((f) => (
                <FindingCard key={f.id} meta={meta} finding={f} onOpen={open} />
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">Nothing stands out: no validation problems, unreachable or unusable classes, or outliers.</p>
          )}
        </section>

        <section aria-label="Structure" className="grid gap-3 lg:grid-cols-3">
          <Card title="Inheritance depth" caption="Classes by how many supertype levels sit above them">
            <Bars data={report.ditDistribution.map((n, d) => ({ label: String(d), value: n }))} unit="classes" axis="levels above" />
          </Card>
          <Card title="Features per class" caption="Own and inherited attributes and references">
            <Bars data={report.featureDistribution.map((n, i) => ({ label: FEATURE_BUCKETS[i]!.label, value: n }))} unit="classes" axis="features" />
          </Card>
          <Card title="Containment" caption="How instances nest, starting from the root classes">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-[13px]">
              <dt className="text-muted-foreground">Roots</dt>
              <dd className="flex flex-wrap gap-1">
                {report.containment.roots.length ? report.containment.roots.map((r) => <Tag key={r}>{r}</Tag>) : <span className="text-muted-foreground">none</span>}
              </dd>
              <dt className="text-muted-foreground">Deepest</dt>
              <dd>
                {report.containment.depth} level{report.containment.depth === 1 ? '' : 's'}
              </dd>
              <dt className="text-muted-foreground">Recursive</dt>
              <dd className="flex flex-wrap gap-1">
                {report.containment.recursive.length ? report.containment.recursive.map((r) => <Tag key={r}>{r}</Tag>) : <span className="text-muted-foreground">none</span>}
              </dd>
            </dl>
          </Card>
        </section>

        <ClassTable meta={meta} rows={report.classes} onOpen={open} />
      </div>
    </main>
  )
}

function Stat({ label, value, detail }: { label: string; value: number; detail: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <div className="text-[12.5px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  )
}

function Card({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4">
      <h3 className="text-[13px] font-semibold">{title}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{caption}</p>
      <div className="mt-auto">{children}</div>
    </div>
  )
}

const Tag = ({ children }: { children: ReactNode }) => <span className="rounded-md border px-1.5 py-0.5 font-mono text-[12px]">{children}</span>

/** One series of counts as columns: value above each, label below, a tooltip on hover. */
function Bars({ data, unit, axis }: { data: { label: string; value: number }[]; unit: string; axis: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <figure>
      <div role="img" aria-label={data.map((d) => `${d.label} ${axis}: ${d.value} ${unit}`).join(', ')} className="flex h-32 items-end gap-0.5 border-b">
        {data.map((d) => (
          <div key={d.label} title={`${d.label} ${axis}: ${d.value} ${unit}`} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[11px] text-muted-foreground tabular-nums group-hover:text-foreground">{d.value}</span>
            <div
              className="w-full max-w-10 rounded-t-[4px] bg-primary/80 transition-colors group-hover:bg-primary"
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 2 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-0.5">
        {data.map((d) => (
          <span key={d.label} className="min-w-0 flex-1 truncate text-center text-[11px] text-muted-foreground tabular-nums">
            {d.label}
          </span>
        ))}
      </div>
      <figcaption className="mt-0.5 text-center text-[11px] text-muted-foreground">{axis}</figcaption>
    </figure>
  )
}

const SHOWN = 12

function FindingCard({ meta, finding, onOpen }: { meta: Metamodel; finding: Finding; onOpen: (id: string) => void }) {
  const [all, setAll] = useState(false)
  const { label, icon: Icon, className } = SEVERITY[finding.severity]
  const items = all ? finding.items : finding.items.slice(0, SHOWN)
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <div className="flex items-start gap-2">
        <Icon className={cn('mt-0.5 size-4 flex-none', className)} aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-[13.5px] font-medium">
            <span className={cn('mr-1.5 text-xs font-normal', className)}>{label}</span>
            {finding.title}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground tabular-nums">{finding.items.length}</span>
          </h3>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">{finding.detail}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {items.map((item, i) => {
              const node = item.nodeId ? meta.graph.nodes.get(item.nodeId) : undefined
              const body = (
                <>
                  {node && <ClassifierIcon node={node} />}
                  <span className="truncate">{item.label}</span>
                  {item.note && <span className="truncate text-muted-foreground">{item.note}</span>}
                </>
              )
              return (
                <li key={i} className="max-w-full">
                  {item.nodeId ? (
                    <button
                      type="button"
                      title="Open in Edit mode"
                      onClick={() => onOpen(item.nodeId!)}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[12.5px] hover:border-primary/50 hover:bg-muted"
                    >
                      {body}
                    </button>
                  ) : (
                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[12.5px]">{body}</span>
                  )}
                </li>
              )
            })}
            {finding.items.length > SHOWN && (
              <li>
                <button type="button" onClick={() => setAll(!all)} className="rounded-md px-1.5 py-0.5 text-[12.5px] text-primary hover:underline">
                  {all ? 'Show fewer' : `${finding.items.length - SHOWN} more`}
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}

type SortKey = keyof Pick<ClassRow, 'name' | 'packageName' | 'kind' | 'attributes' | 'references' | 'operations' | 'inherited' | 'dit' | 'noc' | 'fanIn' | 'fanOut' | 'containers'>

const COLUMNS: { key: SortKey; label: string; title: string; numeric?: boolean }[] = [
  { key: 'name', label: 'Class', title: 'Class name' },
  { key: 'packageName', label: 'Package', title: 'Package' },
  { key: 'kind', label: 'Kind', title: 'Class, abstract class or interface' },
  { key: 'attributes', label: 'Attrs', title: 'Own attributes', numeric: true },
  { key: 'references', label: 'Refs', title: 'Own references', numeric: true },
  { key: 'operations', label: 'Ops', title: 'Own operations', numeric: true },
  { key: 'inherited', label: 'Inherited', title: 'Features inherited from supertypes', numeric: true },
  { key: 'dit', label: 'DIT', title: 'Depth of inheritance', numeric: true },
  { key: 'noc', label: 'NOC', title: 'Number of direct subclasses', numeric: true },
  { key: 'fanIn', label: 'Fan-in', title: 'Classes with references to this one', numeric: true },
  { key: 'fanOut', label: 'Fan-out', title: 'Classes this one references', numeric: true },
  { key: 'containers', label: 'Containers', title: 'Classes that can contain this one', numeric: true },
]

function ClassTable({ meta, rows, onOpen }: { meta: Metamodel; rows: ClassRow[]; onOpen: (id: string) => void }) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'name', desc: false })
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const shown = rows
    .filter((r) => !needle || `${r.name} ${r.packageName}`.toLowerCase().includes(needle))
    .sort((a, b) => {
      const x = a[sort.key]
      const y = b[sort.key]
      const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
      return sort.desc ? -order : order
    })
  return (
    <section aria-labelledby="classes">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 id="classes" className="text-[15px] font-semibold">
          Classes <span className="text-[12.5px] font-normal text-muted-foreground">{rows.length}</span>
        </h2>
        <span className="flex-1" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter classes" className="h-8 w-56 text-[12.5px]" />
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-[12.5px] tabular-nums">
          <thead className="border-b text-muted-foreground">
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} title={c.title} className={cn('px-3 py-2 font-medium whitespace-nowrap', c.numeric ? 'text-right' : 'text-left')}>
                  <button
                    type="button"
                    onClick={() => setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : !!c.numeric }))}
                    className="inline-flex items-center gap-0.5 hover:text-foreground"
                    aria-sort={sort.key === c.key ? (sort.desc ? 'descending' : 'ascending') : undefined}
                  >
                    {c.label}
                    {sort.key === c.key && (sort.desc ? <ArrowDownIcon className="size-3" /> : <ArrowUpIcon className="size-3" />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const node = meta.graph.nodes.get(r.id)
              return (
                <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/50">
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <button type="button" onClick={() => onOpen(r.id)} title="Open in Edit mode" className="inline-flex items-center gap-1.5 hover:text-primary hover:underline">
                      {node && <ClassifierIcon node={node} />}
                      {r.name}
                    </button>
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{r.packageName}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{r.kind}</td>
                  {COLUMNS.filter((c) => c.numeric).map((c) => (
                    <td key={c.key} className={cn('px-3 py-1.5 text-right', !r[c.key] && 'text-muted-foreground/60')}>
                      {r[c.key]}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
