import { FEATURE_BUCKETS, type Finding, type Report } from './analyze'

const SEVERITY_LABEL: Record<Finding['severity'], string> = { error: 'Error', warning: 'Warning', info: 'Note' }
const cell = (s: string | number) => String(s).replace(/\|/g, '\\|')

/** The summary rows, shared by both formats. */
function summaryRows(r: Report): [string, string][] {
  const s = r.summary
  return [
    ['Files', String(r.files.length)],
    ['Packages', String(s.packages)],
    ['Classes', `${s.classes} (${s.abstractClasses} abstract, ${s.interfaces} interfaces)`],
    ['Enums / data types', `${s.enums} / ${s.dataTypes}`],
    ['Attributes', String(s.attributes)],
    ['References', `${s.references} (${s.containments} containment, ${s.bidirectional} with an opposite)`],
    ['Operations', String(s.operations)],
    ['Constrained features', String(s.constrainedFeatures)],
    ['Validation', `${s.errors} errors, ${s.warnings} warnings`],
    ['Containment roots', r.containment.roots.join(', ') || 'none'],
    ['Deepest containment', `${r.containment.depth} level${r.containment.depth === 1 ? '' : 's'}`],
  ]
}

const CLASS_COLUMNS = ['Class', 'Package', 'Kind', 'Attrs', 'Refs', 'Ops', 'Inherited', 'DIT', 'NOC', 'Fan-in', 'Fan-out', 'Containers'] as const
const classCells = (c: Report['classes'][number]) => [c.name, c.packageName, c.kind, c.attributes, c.references, c.operations, c.inherited, c.dit, c.noc, c.fanIn, c.fanOut, c.containers]

export function reportMarkdown(r: Report): string {
  const lines: string[] = []
  lines.push('# Metamodel analysis', '', `${r.files.join(', ')} · ${new Date(r.generatedAt).toLocaleString()}`, '')
  lines.push('## Summary', '', '| | |', '|---|---|', ...summaryRows(r).map(([k, v]) => `| ${k} | ${cell(v)} |`), '')
  lines.push('## Findings', '')
  if (!r.findings.length) lines.push('Nothing to report.', '')
  for (const f of r.findings) {
    lines.push(`### ${SEVERITY_LABEL[f.severity]}: ${f.title} (${f.items.length})`, '', f.detail, '')
    for (const item of f.items) lines.push(`- ${item.label}${item.note ? ` (${item.note})` : ''}`)
    lines.push('')
  }
  lines.push('## Inheritance depth', '', '| Depth | Classes |', '|---|---|', ...r.ditDistribution.map((n, d) => `| ${d} | ${n} |`), '')
  lines.push('## Features per class', '', '| Features | Classes |', '|---|---|', ...r.featureDistribution.map((n, i) => `| ${FEATURE_BUCKETS[i]!.label} | ${n} |`), '')
  lines.push('## Classes', '', `| ${CLASS_COLUMNS.join(' | ')} |`, `|${CLASS_COLUMNS.map(() => '---').join('|')}|`)
  for (const c of r.classes) lines.push(`| ${classCells(c).map(cell).join(' | ')} |`)
  lines.push('', 'DIT: depth of inheritance. NOC: direct subclasses. Fan-in/out: classes referencing / referenced. Containers: classes that can contain it.', '')
  return lines.join('\n')
}

const esc = (s: string | number) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** A self-contained HTML page of the report, readable in either colour scheme and printable. */
export function reportHtml(r: Report): string {
  const table = (head: readonly string[], rows: (string | number)[][]) =>
    `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  const findings = r.findings
    .map(
      (f) => `<section class="finding ${f.severity}"><h3><span class="badge">${SEVERITY_LABEL[f.severity]}</span> ${esc(f.title)} <small>${f.items.length}</small></h3><p>${esc(f.detail)}</p><ul>${f.items.map((i) => `<li>${esc(i.label)}${i.note ? ` <small>${esc(i.note)}</small>` : ''}</li>`).join('')}</ul></section>`,
    )
    .join('')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Metamodel analysis</title>
<style>
:root{--bg:#fff;--fg:#18181b;--muted:#71717a;--border:#e4e4e7;--card:#fafafa;--error:#dc2626;--warning:#b45309;--info:#2563eb}
@media (prefers-color-scheme:dark){:root{--bg:#09090b;--fg:#fafafa;--muted:#a1a1aa;--border:#27272a;--card:#18181b;--error:#f87171;--warning:#fbbf24;--info:#60a5fa}}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,sans-serif}
main{max-width:1100px;margin:0 auto;padding:32px 16px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 12px}h3{font-size:14px;margin:0 0 4px}
.meta,small,p{color:var(--muted)}small{font-weight:400}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--border)}th{color:var(--muted);font-weight:500}
.wrap{overflow-x:auto}
.finding{border:1px solid var(--border);background:var(--card);border-radius:10px;padding:12px 14px;margin:0 0 10px}
.finding p{margin:0 0 6px}.finding ul{margin:0;padding-left:18px}
.badge{font-size:11px;border:1px solid currentColor;border-radius:999px;padding:1px 7px;margin-right:4px}
.error .badge{color:var(--error)}.warning .badge{color:var(--warning)}.info .badge{color:var(--info)}
</style></head><body><main>
<h1>Metamodel analysis</h1><p class="meta">${esc(r.files.join(', '))} · ${esc(new Date(r.generatedAt).toLocaleString())}</p>
<h2>Summary</h2>${table(['', ''], summaryRows(r))}
<h2>Findings</h2>${findings || '<p>Nothing to report.</p>'}
<h2>Inheritance depth</h2>${table(['Depth', 'Classes'], r.ditDistribution.map((n, d) => [d, n]))}
<h2>Features per class</h2>${table(['Features', 'Classes'], r.featureDistribution.map((n, i) => [FEATURE_BUCKETS[i]!.label, n]))}
<h2>Classes</h2><div class="wrap">${table(CLASS_COLUMNS, r.classes.map(classCells))}</div>
<p>DIT: depth of inheritance. NOC: direct subclasses. Fan-in/out: classes referencing / referenced. Containers: classes that can contain it.</p>
</main></body></html>
`
}
