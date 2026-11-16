import { PlusIcon, Trash2Icon, XIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ProblemIcon } from '@/components/edit/ProblemIcon'
import { LabelledCheckbox } from '@/components/sidebar/LabelledCheckbox'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useEditTarget } from '@/hooks/useEditTarget'
import { useInstanceEdit } from '@/hooks/useInstanceEdit'
import { useInstances } from '@/hooks/useInstances'
import { useProblems } from '@/hooks/useProblems'
import { pathOf, refId, type ElementRef } from '@/lib/ecore/edit/dom'
import { concreteFamily, conforms, type MetaFeature, type Metamodel } from '@/lib/instance/metamodel'
import type { InstanceFile } from '@/lib/instance/objectGraph'
import {
  allObjects,
  attributeValues,
  classOf,
  isRoot,
  labelOf,
  rootObjects,
  objectByFragment,
  referenceTokens,
  setReferences,
  setValue,
  setValues,
} from '@/lib/instance/xmi'
import { focusField, restoreFocusUnlessTyping } from '@/lib/keys'
import { ClassBadge } from './InstanceTree'

interface Ctx {
  meta: Metamodel
  file: InstanceFile
  el: Element
  target: ElementRef
  run: ReturnType<typeof useInstanceEdit>['run']
}

const NONE = '__none__'

function FeatureLabel({ feature, htmlFor }: { feature: MetaFeature; htmlFor?: string }) {
  const bounds = feature.many ? ` [${feature.lower}..${feature.upper < 0 ? '*' : feature.upper}]` : ''
  return (
    <label htmlFor={htmlFor} className="flex items-baseline gap-1.5 text-xs text-muted-foreground">
      <span className="text-foreground">{feature.name}</span>
      {feature.lower > 0 && <span className="text-destructive" title="Required">*</span>}
      <span className="truncate font-mono text-[11px]">
        {feature.typeName}
        {bounds}
      </span>
      {feature.readOnly && <span className="ml-auto italic">derived, not stored</span>}
    </label>
  )
}

function Chip({ children, onRemove, onClick, label }: { children: ReactNode; onRemove?: () => void; onClick?: () => void; label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border bg-card py-0.5 pr-0.5 pl-1.5 font-mono text-[12px]">
      {onClick ? (
        <button type="button" onClick={onClick} className="truncate text-primary underline-offset-2 hover:underline">
          {children}
        </button>
      ) : (
        <span className="truncate">{children}</span>
      )}
      {onRemove && (
        <button type="button" aria-label={`Remove ${label}`} onClick={onRemove} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <XIcon className="size-3" />
        </button>
      )}
    </span>
  )
}

/** One attribute, entered by the control its type calls for. */
function AttributeField({ ctx, feature, focus }: { ctx: Ctx; feature: MetaFeature; focus: boolean }) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const { focusRequest, takeFocus } = useEditTarget()
  const own = refId(ctx.target)
  const values = attributeValues(ctx.el, feature)
  const [draft, setDraft] = useState('')
  useEffect(() => {
    if (!focus || !focusRequest || focusRequest.refId !== own || !takeFocus(focusRequest)) return
    focusField(input.current)
  }, [focus, focusRequest, own, takeFocus])

  const set = (value: string | null) =>
    ctx.run(`change ${feature.name}`, (d) => setValue(d, ctx.target, feature, value === '' ? null : value), { coalesce: `${own}:${feature.name}` })
  const setAll = (next: string[]) => ctx.run(`change ${feature.name}`, (d, m) => setValues(d, m, ctx.target, feature, next))

  if (feature.many) {
    const add = (value: string) => {
      if (value === '') return
      setAll([...values, value])
      setDraft('')
    }
    return (
      <div className="grid gap-1">
        <FeatureLabel feature={feature} htmlFor={id} />
        <div className="flex flex-wrap items-center gap-1.5">
          {values.map((v, i) => (
            <Chip key={`${v}|${i}`} label={v} onRemove={feature.readOnly ? undefined : () => setAll(values.filter((_, j) => j !== i))}>
              {v}
            </Chip>
          ))}
        </div>
        {!feature.readOnly &&
          (feature.valueKind === 'enum' ? (
            <Select value={null} items={feature.literals.map((l) => ({ value: l, label: l }))} onValueChange={(v) => typeof v === 'string' && add(v)}>
              <SelectTrigger size="sm" className="w-full" aria-label={`Add to ${feature.name}`}>
                <SelectValue placeholder="Add a value" />
              </SelectTrigger>
              <SelectContent>
                {feature.literals.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={id}
              ref={input}
              value={draft}
              placeholder="Type a value and press Enter"
              className="font-mono text-[12.5px]"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  add(draft)
                }
              }}
            />
          ))}
      </div>
    )
  }

  const value = values[0] ?? ''
  if (feature.valueKind === 'boolean') {
    const checked = value ? value === 'true' : feature.defaultValue === 'true'
    return (
      <LabelledCheckbox
        label={feature.name}
        checked={checked}
        disabled={feature.readOnly}
        title={feature.typeName}
        onChange={(next) => set(next === (feature.defaultValue === 'true') ? null : String(next))}
      />
    )
  }
  if (feature.valueKind === 'enum') {
    const items = [{ value: NONE, label: feature.defaultValue ? `Default (${feature.defaultValue})` : 'Not set' }, ...feature.literals.map((l) => ({ value: l, label: l }))]
    return (
      <div className="grid gap-1">
        <FeatureLabel feature={feature} />
        <Select
          value={value || NONE}
          items={items}
          disabled={feature.readOnly}
          onValueChange={(v) => typeof v === 'string' && set(v === NONE ? null : v)}
        >
          <SelectTrigger size="sm" className="w-full font-mono text-[12.5px]" aria-label={feature.name}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                <span className={item.value === NONE ? 'text-muted-foreground italic' : 'font-mono'}>{item.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }
  const numeric = feature.valueKind === 'int' || feature.valueKind === 'float'
  return (
    <div className="grid gap-1">
      <FeatureLabel feature={feature} htmlFor={id} />
      <Input
        id={id}
        ref={input}
        // Dates use the browser's picker; EMF reads a plain yyyy-mm-dd date.
        type={feature.valueKind === 'date' ? 'date' : 'text'}
        inputMode={numeric ? (feature.valueKind === 'int' ? 'numeric' : 'decimal') : undefined}
        value={feature.valueKind === 'date' ? value.slice(0, 10) : value}
        placeholder={feature.defaultValue ?? ''}
        disabled={feature.readOnly}
        spellCheck={false}
        className={numeric || feature.isId ? 'font-mono text-[12.5px]' : undefined}
        onChange={(e) => set(e.target.value)}
      />
    </div>
  )
}

const objectLabel = (meta: Metamodel, el: Element) => {
  const { name, className } = labelOf(meta, el)
  return name ? `${name} : ${className}` : `: ${className}`
}

/** A non-containment reference, chosen from the objects in this file that fit its type. */
function ReferenceField({ ctx, feature }: { ctx: Ctx; feature: MetaFeature }) {
  const { setTarget } = useEditTarget()
  const edit = useInstanceEdit()
  if (feature.container) return <ContainerField ctx={ctx} feature={feature} />
  const doc = ctx.file.doc
  const current = referenceTokens(ctx.el, feature).map((t) => ({ token: t, el: objectByFragment(ctx.meta, doc, t) }))
  const candidates = allObjects(ctx.meta, doc).filter((o) => {
    const c = classOf(ctx.meta, o)
    return o !== ctx.el && !!c && conforms(ctx.meta, c.id, feature.typeId) && !current.some((x) => x.el === o)
  })
  const refOf = (el: Element): ElementRef => ({ key: ctx.file.key, path: pathOf(el) })
  const write = (targets: Element[]) =>
    ctx.run(`change ${feature.name}`, (d, m) => setReferences(d, m, ctx.target, feature, targets.map(refOf)))
  const resolved = current.flatMap((x) => (x.el ? [x.el] : []))
  const options = candidates.map((o, i) => ({ value: String(i), label: objectLabel(ctx.meta, o) }))

  const creatable = feature.readOnly ? [] : concreteFamily(ctx.meta, feature.typeId)
  const create =
    creatable.length === 1 ? (
      <Button
        variant="outline"
        size="icon-sm"
        className="flex-none"
        aria-label={`New ${creatable[0]!.name} for ${feature.name}`}
        title={`New ${creatable[0]!.name}, put where it fits in this file`}
        onClick={() => edit.createReferenced(ctx.target, feature, creatable[0]!)}
      >
        <PlusIcon />
      </Button>
    ) : creatable.length > 1 ? (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="icon-sm" className="flex-none" aria-label={`New object for ${feature.name}`} title="New object, put where it fits in this file" />}
        >
          <PlusIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {creatable.map((c) => (
            <DropdownMenuItem key={c.id} onClick={() => edit.createReferenced(ctx.target, feature, c)}>
              <ClassBadge meta={ctx.meta} cls={c} />
              New {c.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null

  const picker = (placeholder: string, onPick: (el: Element) => void) => (
    <div className="flex items-center gap-1.5">
      <Select value={null} items={options} disabled={!options.length || feature.readOnly} onValueChange={(v) => typeof v === 'string' && candidates[Number(v)] && onPick(candidates[Number(v)]!)}>
        <SelectTrigger size="sm" className="min-w-0 flex-1 font-mono text-[12.5px]" aria-label={`Choose ${feature.name}`}>
          <SelectValue
            placeholder={options.length ? placeholder : current.length ? `No other ${feature.typeName} to add` : `No ${feature.typeName} in this file yet`}
          />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              <span className="font-mono">{o.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {create}
    </div>
  )

  return (
    <div className="grid gap-1">
      <FeatureLabel feature={feature} />
      {current.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {current.map(({ token, el }, i) => (
            <Chip
              key={`${token}|${i}`}
              label={el ? objectLabel(ctx.meta, el) : token}
              onClick={el ? () => setTarget(refOf(el), { center: true }) : undefined}
              onRemove={feature.readOnly ? undefined : () => write(resolved.filter((r) => r !== el))}
            >
              {el ? objectLabel(ctx.meta, el) : `${token} (missing)`}
            </Chip>
          ))}
        </div>
      )}
      {(feature.many || !current.length) && picker(feature.many ? 'Add a reference' : 'Choose an object', (el) => write(feature.many ? [...resolved, el] : [el]))}
    </div>
  )
}

/** The opposite of a containment: the object this one sits in, which only moving the object changes. */
function ContainerField({ ctx, feature }: { ctx: Ctx; feature: MetaFeature }) {
  const { setTarget } = useEditTarget()
  const parent = isRoot(ctx.el) ? null : ctx.el.parentElement
  const parentClass = parent && classOf(ctx.meta, parent)
  const holds = parentClass && conforms(ctx.meta, parentClass.id, feature.typeId) ? parent : null
  return (
    <div className="grid gap-1">
      <FeatureLabel feature={{ ...feature, readOnly: false }} />
      {holds ? (
        <div>
          <Chip label={objectLabel(ctx.meta, holds)} onClick={() => setTarget({ key: ctx.file.key, path: pathOf(holds) }, { center: true })}>
            {objectLabel(ctx.meta, holds)}
          </Chip>
        </div>
      ) : (
        <p className="text-[12.5px] text-muted-foreground">Not inside a {feature.typeName}.</p>
      )}
      <p className="text-xs text-muted-foreground">Set by where the object sits; move it to change this.</p>
    </div>
  )
}

/** A containment reference: the objects it holds, each leading to itself, and a way to add another. */
function ContainmentField({ ctx, feature }: { ctx: Ctx; feature: MetaFeature }) {
  const { setTarget } = useEditTarget()
  const edit = useInstanceEdit()
  const children = Array.from(ctx.el.children).filter((c) => c.localName === feature.name)
  const classes = concreteFamily(ctx.meta, feature.typeId)
  const full = feature.upper > 0 && children.length >= feature.upper
  const add = !full && !feature.readOnly && classes.length > 0 && (
    classes.length === 1 ? (
      <Button variant="ghost" size="xs" aria-label={`Add ${classes[0]!.name} to ${feature.name}`} onClick={() => edit.create(ctx.target, feature.name, classes[0]!)}>
        <PlusIcon />
      </Button>
    ) : (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="xs" aria-label={`Add to ${feature.name}`} />}>
          <PlusIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48" finalFocus={restoreFocusUnlessTyping}>
          {classes.map((c) => (
            <DropdownMenuItem key={c.id} onClick={() => edit.create(ctx.target, feature.name, c)}>
              <ClassBadge meta={ctx.meta} cls={c} />
              {c.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  )
  return (
    <section className="mt-4">
      <div className="mb-1 flex items-center gap-1.5">
        <h3 className="text-[13px] font-semibold">
          {feature.name}
          <small className="ml-1 font-normal text-muted-foreground">{children.length}</small>
        </h3>
        {feature.lower > 0 && <span className="text-destructive" title="Required">*</span>}
        <span className="flex-1" />
        {add}
      </div>
      {children.length ? (
        <ul className="-mx-1.5">
          {children.map((child, i) => {
            const ref: ElementRef = { key: ctx.file.key, path: pathOf(child) }
            const { name, className } = labelOf(ctx.meta, child)
            return (
              <li key={i} className="group/item flex min-h-7 items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-muted">
                <ClassBadge meta={ctx.meta} cls={classOf(ctx.meta, child)} />
                <button type="button" onClick={() => setTarget(ref, { center: true })} className="min-w-0 truncate text-left">
                  {name || <span className="text-muted-foreground italic">unnamed</span>}
                </button>
                <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-muted-foreground">: {className}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Delete ${name || className}`}
                  className="size-5 flex-none opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100"
                  onClick={() => {
                    edit.remove(ref)
                    setTarget(ctx.target)
                  }}
                >
                  <Trash2Icon />
                </Button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-[12.5px] text-muted-foreground">None yet.</p>
      )}
    </section>
  )
}

/** Instance mode's side panel: the targeted object's values, references and contents. */
export function InstancePropertiesPanel() {
  const { meta, instanceFiles } = useInstances()
  const { target, element, setTarget } = useEditTarget()
  const edit = useInstanceEdit()
  const { byRef } = useProblems()
  const file = instanceFiles.find((f) => f.key === target?.key)

  if (!meta || !target || !element || !file) {
    return (
      <div className="text-[12.5px] text-muted-foreground">
        <h2 className="text-[15px] font-semibold text-foreground">Properties</h2>
        <p className="mt-1.5">Select an object in the tree or on the diagram to fill in its values.</p>
      </div>
    )
  }
  const cls = classOf(meta, element)
  const { name, className } = labelOf(meta, element)
  const ctx: Ctx = { meta, file, el: element, target, run: edit.run }
  const features = cls?.features ?? []
  const attributes = features.filter((f) => f.kind === 'attribute')
  const references = features.filter((f) => f.kind === 'reference' && !f.containment)
  const containments = features.filter((f) => f.kind === 'reference' && f.containment)
  const firstText = attributes.find((f) => !f.many && !f.readOnly && (f.valueKind === 'string' || f.valueKind === 'int' || f.valueKind === 'float'))
  const problems = byRef.get(refId(target)) ?? []

  return (
    <div>
      <div className="flex items-start gap-2">
        <div className="mt-[3px]">
          <ClassBadge meta={meta} cls={cls} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] leading-tight font-semibold break-words">
            {name || <span className="text-muted-foreground italic">unnamed</span>}
          </h2>
          <p className="mt-0.5 text-[12.5px] break-words text-muted-foreground">
            {className}
            {isRoot(element) ? ' · root object' : ` in ${element.localName}`} · {file.name}
          </p>
        </div>
        {(!isRoot(element) || rootObjects(file.doc).length > 1) && (
          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${name || className}`} title="Delete (Del)" onClick={() => edit.remove(target)}>
            <Trash2Icon />
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" aria-label="Close properties" onClick={() => setTarget(null)}>
          <XIcon />
        </Button>
      </div>

      {problems.length > 0 && (
        <ul aria-label="Problems" className="mt-3 grid gap-1 rounded-lg border p-2">
          {problems.map((problem, i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px] leading-snug">
              <ProblemIcon severity={problem.severity} className="mt-0.5" />
              {problem.message}
            </li>
          ))}
        </ul>
      )}

      {!cls && <p className="mt-4 text-[12.5px] text-muted-foreground">This object's class isn't in the open metamodels, so its values can't be edited here.</p>}

      {attributes.length > 0 && (
        <section className="mt-4">
          <h3 className="mb-2 text-[13px] font-semibold">Attributes</h3>
          <div className="grid gap-3">
            {attributes.map((f) => (
              <AttributeField key={f.name} ctx={ctx} feature={f} focus={f === firstText} />
            ))}
          </div>
        </section>
      )}

      {references.length > 0 && (
        <section className="mt-4">
          <h3 className="mb-2 text-[13px] font-semibold">References</h3>
          <div className="grid gap-3">
            {references.map((f) => (
              <ReferenceField key={f.name} ctx={ctx} feature={f} />
            ))}
          </div>
        </section>
      )}

      {containments.map((f) => (
        <ContainmentField key={f.name} ctx={ctx} feature={f} />
      ))}
    </div>
  )
}
