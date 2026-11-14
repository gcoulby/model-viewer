import { PlusIcon, Trash2Icon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDiagram } from '@/hooks/useDiagram'
import { useEditTarget } from '@/hooks/useEditTarget'
import { useModelEdit } from '@/hooks/useModelEdit'
import { useModels } from '@/hooks/useModels'
import { useWorkspaceDocs } from '@/hooks/useWorkspaceDocs'
import { KIND_LABEL, PROPERTIES, kindOf, newChildrenOf, type PropSpec } from '@/lib/ecore/edit/kinds'
import { rowLabel } from '@/lib/ecore/edit/labels'
import { graphIdOf } from '@/lib/ecore/edit/refs'
import { modKey } from '@/lib/keys'
import { KindBadge } from './KindBadge'
import { PropertyField, type FieldContext } from './PropertyFields'

function containerName(el: Element): string | null {
  for (let parent = el.parentElement; parent; parent = parent.parentElement) {
    const kind = kindOf(parent)
    if (kind && kind !== 'EGenericType') return rowLabel(parent).name || KIND_LABEL[kind]
  }
  return null
}

/** Edit mode's side panel: every editable property of the targeted element, as Eclipse's property sheet. */
export function PropertiesPanel() {
  const { target, element, setTarget } = useEditTarget()
  const { files } = useModels()
  const docs = useWorkspaceDocs()
  const { graph } = useDiagram()
  const edit = useModelEdit()

  if (!target || !element) return <EmptyProperties />
  const kind = kindOf(element)
  const file = files.find((f) => f.key === target.key)
  if (!kind || !file) return <EmptyProperties />

  const ctx: FieldContext = { target, el: element, file, files, docs, run: edit.run }
  const { name } = rowLabel(element)
  const node = graph?.nodes.get(graphIdOf(file.index, element) ?? '')
  const container = containerName(element)
  const children = newChildrenOf(element)
  // The first text field takes focus when something new is made, so its name can be typed straight away.
  const firstText = PROPERTIES[kind].flatMap((section) => section.props).find((p) => p.type === 'text')

  return (
    <div>
      <div className="flex items-start gap-2">
        <div className="mt-[3px]">
          <KindBadge kind={kind} node={node} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] leading-tight font-semibold break-words">
            {name || <span className="text-muted-foreground italic">unnamed</span>}
          </h2>
          <p className="mt-0.5 text-[12.5px] break-words text-muted-foreground">
            {KIND_LABEL[kind]}
            {container && ` in ${container}`} · {file.name}
          </p>
        </div>
        {target.path.length > 0 && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${name || KIND_LABEL[kind].toLowerCase()}`}
            title="Delete (Del)"
            onClick={() => edit.remove(target)}
          >
            <Trash2Icon />
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" aria-label="Close properties" onClick={() => setTarget(null)}>
          <XIcon />
        </Button>
      </div>

      {PROPERTIES[kind].map((section) => {
        const bools = section.props.filter((p): p is Extract<PropSpec, { type: 'bool' }> => p.type === 'bool')
        const others = section.props.filter((p) => p.type !== 'bool')
        return (
          <section key={section.title} className="mt-4">
            <h3 className="mb-2 text-[13px] font-semibold">{section.title}</h3>
            <div className="grid gap-3">
              {others.map((spec, i) => (
                <PropertyField
                  key={`${'attr' in spec ? spec.attr : spec.type}|${i}`}
                  ctx={ctx}
                  spec={spec}
                  focus={spec === firstText}
                />
              ))}
              {bools.length > 0 && (
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {bools.map((spec) => (
                    <PropertyField key={spec.attr} ctx={ctx} spec={spec} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )
      })}

      {children.length > 0 && (
        <section className="mt-5">
          <h3 className="mb-2 text-[13px] font-semibold">Add inside</h3>
          <div className="flex flex-wrap gap-1.5">
            {children.map((spec) => (
              <Button key={`${spec.tag}|${spec.label}`} variant="outline" size="sm" onClick={() => edit.create(target, spec)}>
                <PlusIcon />
                {spec.label}
              </Button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function EmptyProperties() {
  return (
    <div className="text-[12.5px] text-muted-foreground">
      <h2 className="text-[15px] font-semibold text-foreground">Properties</h2>
      <p className="mt-1.5">Select something in the tree or on the diagram to edit it.</p>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        <dt className="font-mono">Right-click</dt>
        <dd>Add, duplicate, move or delete in the tree</dd>
        <dt className="font-mono">Enter</dt>
        <dd>Rename the selected element</dd>
        <dt className="font-mono">Del</dt>
        <dd>Delete it</dd>
        <dt className="font-mono">Alt ↑ ↓</dt>
        <dd>Move it up or down</dd>
        <dt className="font-mono">{modKey('Z')}</dt>
        <dd>Undo</dd>
      </dl>
    </div>
  )
}
