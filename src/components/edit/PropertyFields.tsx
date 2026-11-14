import { PlusIcon, XIcon } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, type ReactNode } from 'react'
import { LabelledCheckbox } from '@/components/sidebar/LabelledCheckbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  fitsFilter,
  keyCandidates,
  oppositeCandidates,
  typeCandidates,
  typeParametersInScope,
} from '@/lib/ecore/edit/candidates'
import { refId, type ElementRef } from '@/lib/ecore/edit/dom'
import type { PropSpec, TypeFilter } from '@/lib/ecore/edit/kinds'
import { tokenName, typeLabel } from '@/lib/ecore/edit/labels'
import {
  setAttribute,
  setClassifierRef,
  setFlag,
  setMultiplicity,
  setOpposite,
  setType,
  type EditDocs,
} from '@/lib/ecore/edit/ops'
import { fragmentOf, refItems, refTo, refTokens, resolveToken, splitToken, type RefFile } from '@/lib/ecore/edit/refs'
import type { EditOptions } from '@/contexts/models-context'
import { useEditTarget } from '@/hooks/useEditTarget'
import { candidateOptions } from './pickerOptions'
import { TypePicker, type PickerOption } from './TypePicker'

/** What every field needs: the element, where it is, and a way to change it. */
export interface FieldContext {
  target: ElementRef
  el: Element
  file: RefFile
  files: RefFile[]
  docs: ReadonlyMap<string, Document>
  run: <T>(label: string, change: (d: EditDocs) => T, options?: EditOptions) => T | undefined
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

function TextField({ ctx, spec, focus }: { ctx: FieldContext; spec: Extract<PropSpec, { type: 'text' | 'raw' }>; focus?: boolean }) {
  const id = useId()
  const input = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const value = ctx.el.getAttribute(spec.attr) ?? ''
  const { focusRequest, takeFocus } = useEditTarget()
  const own = refId(ctx.target)
  useEffect(() => {
    if (!focus || !focusRequest || focusRequest.refId !== own || !takeFocus(focusRequest)) return
    input.current?.focus()
    input.current?.select()
  }, [focus, focusRequest, own, takeFocus])
  const change = (next: string) =>
    ctx.run(spec.attr === 'name' ? 'rename' : `change ${spec.label.toLowerCase()}`, (d) => setAttribute(d, ctx.target, spec.attr, next === '' ? null : next), {
      coalesce: `${refId(ctx.target)}:${spec.attr}`,
    })
  const mono = spec.type === 'raw' || spec.mono
  const placeholder = spec.type === 'text' ? spec.placeholder : undefined
  return (
    <Field label={spec.label} htmlFor={id}>
      {spec.type === 'text' && spec.multiline ? (
        <Textarea ref={input} id={id} value={value} placeholder={placeholder} rows={3} onChange={(e) => change(e.target.value)} />
      ) : (
        <Input
          ref={input}
          id={id}
          value={value}
          placeholder={placeholder}
          spellCheck={false}
          className={mono ? 'font-mono text-[12.5px]' : undefined}
          onChange={(e) => change(e.target.value)}
        />
      )}
    </Field>
  )
}

function BoolField({ ctx, spec }: { ctx: FieldContext; spec: Extract<PropSpec, { type: 'bool' }> }) {
  const raw = ctx.el.getAttribute(spec.attr)
  const checked = raw === null ? spec.def : raw === 'true'
  return (
    <LabelledCheckbox
      label={spec.label}
      checked={checked}
      title={spec.hint}
      onChange={(next) => ctx.run(`${next ? 'set' : 'clear'} ${spec.label.toLowerCase()}`, (d) => setFlag(d, ctx.target, spec.attr, next, spec.def))}
    />
  )
}

function IntField({ ctx, spec }: { ctx: FieldContext; spec: Extract<PropSpec, { type: 'int' }> }) {
  const id = useId()
  return (
    <Field label={spec.label} htmlFor={id}>
      <Input
        id={id}
        type="number"
        value={ctx.el.getAttribute(spec.attr) ?? ''}
        placeholder={String(spec.def)}
        className="font-mono text-[12.5px]"
        onChange={(e) =>
          ctx.run(`change ${spec.label.toLowerCase()}`, (d) => setAttribute(d, ctx.target, spec.attr, e.target.value === '' ? null : e.target.value), {
            coalesce: `${refId(ctx.target)}:${spec.attr}`,
          })
        }
      />
    </Field>
  )
}

const PRESETS: { label: string; lower: number; upper: number }[] = [
  { label: '0..1', lower: 0, upper: 1 },
  { label: '1', lower: 1, upper: 1 },
  { label: '0..*', lower: 0, upper: -1 },
  { label: '1..*', lower: 1, upper: -1 },
]

function MultiplicityField({ ctx }: { ctx: FieldContext }) {
  const id = useId()
  const lower = Number(ctx.el.getAttribute('lowerBound') ?? 0)
  const upper = Number(ctx.el.getAttribute('upperBound') ?? 1)
  const set = (l: number, u: number, coalesce?: string) =>
    ctx.run('change multiplicity', (d) => setMultiplicity(d, ctx.target, l, u), coalesce ? { coalesce } : undefined)
  const parseUpper = (text: string) => (text.trim() === '*' ? -1 : Number.parseInt(text, 10))
  return (
    <Field label="Multiplicity" htmlFor={id}>
      <div className="flex items-center gap-1.5">
        <Input
          id={id}
          aria-label="Lower bound"
          inputMode="numeric"
          value={String(lower)}
          className="w-14 text-center font-mono text-[12.5px]"
          onChange={(e) => {
            const l = Number.parseInt(e.target.value, 10)
            if (!Number.isNaN(l) && l >= 0) set(l, upper, `${refId(ctx.target)}:lower`)
          }}
        />
        <span className="text-muted-foreground">..</span>
        <Input
          aria-label="Upper bound, * for many"
          value={upper === -1 ? '*' : String(upper)}
          className="w-14 text-center font-mono text-[12.5px]"
          onChange={(e) => {
            const u = parseUpper(e.target.value)
            if (!Number.isNaN(u) && (u === -1 || u >= 1)) set(lower, u, `${refId(ctx.target)}:upper`)
          }}
        />
        <div className="ml-auto flex gap-0.5">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              variant={p.lower === lower && p.upper === upper ? 'secondary' : 'ghost'}
              size="xs"
              className="font-mono"
              onClick={() => set(p.lower, p.upper)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>
    </Field>
  )
}

function useTypeOptions(ctx: FieldContext, filter: TypeFilter): PickerOption[] {
  const { files, docs, file } = ctx
  return useMemo(() => {
    const nameOf = (key: string) => files.find((f) => f.key === key)?.name ?? key
    return candidateOptions(
      typeCandidates(files, docs).filter((c) => fitsFilter(c.eKind, filter)),
      file.key,
      nameOf,
    )
  }, [files, docs, file.key, filter])
}

function TypeField({ ctx, spec }: { ctx: FieldContext; spec: Extract<PropSpec, { type: 'type' }> }) {
  const typeOptions = useTypeOptions(ctx, spec.filter)
  const parameters = typeParametersInScope(ctx.el)
  const options: PickerOption[] = [
    ...parameters.map((p) => ({
      id: `tp|${p.fragment}`,
      name: p.name,
      where: 'type parameter',
      group: 'Type parameters',
      candidate: null,
      badge: 'ETypeParameter' as const,
    })),
    ...typeOptions,
  ]
  return (
    <Field label={spec.label}>
      <TypePicker
        label={spec.label}
        value={typeLabel(ctx.el)}
        placeholder={spec.optional ? 'None (void)' : 'Choose a type'}
        options={options}
        onClear={spec.optional ? () => ctx.run('clear type', (d) => setType(d, ctx.target, null)) : undefined}
        onPick={(option) =>
          ctx.run('change type', (d) =>
            setType(d, ctx.target, option.candidate ? option.candidate.choice : { kind: 'typeParameter', fragment: option.id.slice(3) }),
          )
        }
      />
    </Field>
  )
}

function ClassifierField({ ctx, spec }: { ctx: FieldContext; spec: Extract<PropSpec, { type: 'classifier' }> }) {
  const options = useTypeOptions(ctx, 'any')
  const [token] = refTokens(ctx.el.getAttribute(spec.attr))
  return (
    <Field label={spec.label}>
      <TypePicker
        label={spec.label}
        value={token ? tokenName(token) : ''}
        placeholder="None"
        options={options}
        onClear={() => ctx.run('clear classifier', (d) => setClassifierRef(d, ctx.target, spec.attr, null))}
        onPick={(option) => option.candidate && ctx.run('change classifier', (d) => setClassifierRef(d, ctx.target, spec.attr, option.candidate!.choice))}
      />
    </Field>
  )
}

function Chip({ children, onRemove, label }: { children: ReactNode; onRemove: () => void; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-card py-0.5 pr-0.5 pl-1.5 font-mono text-[12px]">
      {children}
      <button type="button" aria-label={`Remove ${label}`} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={onRemove}>
        <XIcon className="size-3" />
      </button>
    </span>
  )
}

function RefsField({ ctx, spec }: { ctx: FieldContext; spec: Extract<PropSpec, { type: 'refs' }> }) {
  const options = useTypeOptions(ctx, spec.filter)
  const items = refItems(ctx.el.getAttribute(spec.attr))
  const own = fragmentOf(ctx.el)
  const present = new Set(items.map((item) => splitToken(item.split(' ').pop() ?? '').fragment))
  const available = options.filter(
    (o) => !(o.candidate?.choice.kind === 'element' && o.candidate.choice.fileKey === ctx.file.key && o.candidate.choice.fragment === own) &&
      !(o.candidate?.choice.kind === 'element' && present.has(o.candidate.choice.fragment)),
  )
  const write = (next: string[], label: string) =>
    ctx.run(label, (d) => setAttribute(d, ctx.target, spec.attr, next.length ? next.join(' ') : null))
  // A supertype's declared type is concrete, so it never carries a type prefix; an exception's is abstract.
  const typed = spec.attr !== 'eSuperTypes'
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((item, i) => {
        const name = tokenName(item.split(' ').pop() ?? '')
        return (
          <Chip key={`${item}|${i}`} label={name} onRemove={() => write(items.filter((_, j) => j !== i), `remove ${spec.label.toLowerCase()}`)}>
            {name}
          </Chip>
        )
      })}
      <TypePicker
        label={`Add to ${spec.label.toLowerCase()}`}
        value=""
        options={available}
        trigger={
          <>
            <PlusIcon />
            Add
          </>
        }
        onPick={(option) =>
          option.candidate &&
          write([...items, refTo(ctx.file, option.candidate.choice, ctx.files, typed)], `add ${spec.label.toLowerCase()}`)
        }
      />
    </div>
  )
}

const NONE = '__none__'

function SelectField({
  label,
  value,
  items,
  disabledText,
  onChange,
}: {
  label: string
  value: string
  items: { value: string; label: string; detail?: string }[] | null
  disabledText: string
  onChange: (value: string) => void
}) {
  const all = [{ value: NONE, label: 'None' }, ...(items ?? [])]
  return (
    <Field label={label}>
      <Select
        value={items ? value || NONE : NONE}
        items={all.map(({ value: v, label: l }) => ({ value: v, label: l }))}
        disabled={!items}
        onValueChange={(next) => typeof next === 'string' && onChange(next === NONE ? '' : next)}
      >
        <SelectTrigger size="sm" className="w-full font-mono text-[12.5px]" aria-label={label}>
          <SelectValue placeholder={disabledText} />
        </SelectTrigger>
        <SelectContent>
          {all.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              <span className={item.value === NONE ? 'text-muted-foreground italic' : 'font-mono'}>{item.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!items && <p className="text-xs text-muted-foreground">{disabledText}</p>}
    </Field>
  )
}

function OppositeField({ ctx }: { ctx: FieldContext }) {
  const candidates = oppositeCandidates(ctx.file, ctx.el, ctx.files, ctx.docs)
  const token = ctx.el.getAttribute('eOpposite')
  const current = token ? resolveToken(ctx.file, token, ctx.files, (k) => ctx.docs.get(k) ?? null) : null
  const currentId = current ? `${current.file.key}#${fragmentOf(current.el)}` : ''
  const items = candidates?.map((c) => ({ value: `${c.fileKey}#${c.fragment}`, label: c.name }))
  // An opposite that no longer fits stays listed, so the field still shows what the file says.
  if (items && current && !items.some((i) => i.value === currentId)) {
    items.push({ value: currentId, label: current.el.getAttribute('name') ?? '?' })
  }
  return (
    <SelectField
      label="Opposite"
      value={currentId}
      items={items ?? null}
      disabledText="Choose a type in an open file first"
      onChange={(next) => {
        const hash = next.indexOf('#')
        ctx.run('change opposite', (d) =>
          setOpposite(d, ctx.target, next ? { fileKey: next.slice(0, hash), fragment: next.slice(hash + 1) } : null),
        )
      }}
    />
  )
}

function KeysField({ ctx }: { ctx: FieldContext }) {
  const candidates = keyCandidates(ctx.file, ctx.el, ctx.files, ctx.docs)
  const items = refItems(ctx.el.getAttribute('eKeys'))
  const names = items.map(tokenName)
  const write = (next: string[], label: string) => ctx.run(label, (d) => setAttribute(d, ctx.target, 'eKeys', next.length ? next.join(' ') : null))
  const available = candidates?.filter((c) => !names.includes(c.name)) ?? []
  if (!candidates?.length && !items.length) return null
  return (
    <Field label="Keys">
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <Chip key={item} label={names[i] ?? ''} onRemove={() => write(items.filter((_, j) => j !== i), 'remove key')}>
            {names[i]}
          </Chip>
        ))}
        {available.length > 0 && (
          <Select
            value={null}
            items={available.map((c) => ({ value: `${c.fileKey}#${c.fragment}`, label: c.name }))}
            onValueChange={(next) => {
              const picked = available.find((c) => `${c.fileKey}#${c.fragment}` === next)
              if (!picked) return
              const token = refTo(ctx.file, { kind: 'element', fileKey: picked.fileKey, fragment: picked.fragment, eKind: 'EAttribute' }, ctx.files, false)
              write([...items, token], 'add key')
            }}
          >
            <SelectTrigger size="sm" aria-label="Add a key">
              <PlusIcon />
              <SelectValue placeholder="Add" />
            </SelectTrigger>
            <SelectContent>
              {available.map((c) => (
                <SelectItem key={c.fragment} value={`${c.fileKey}#${c.fragment}`}>
                  <span className="font-mono">{c.name}</span>
                  <span className="text-muted-foreground"> : {c.detail}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </Field>
  )
}

function TypeParameterField({ ctx }: { ctx: FieldContext }) {
  const parameters = typeParametersInScope(ctx.el)
  const token = ctx.el.getAttribute('eTypeParameter')
  const current = token ? splitToken(token).fragment : ''
  return (
    <SelectField
      label="Type parameter"
      value={current}
      items={parameters.map((p) => ({ value: p.fragment, label: p.name }))}
      disabledText=""
      onChange={(next) => ctx.run('change type parameter', (d) => setAttribute(d, ctx.target, 'eTypeParameter', next ? `#${next}` : null))}
    />
  )
}

/** One property, drawn by the field that fits its kind. `focus` marks the text field a focus request goes to. */
export function PropertyField({ ctx, spec, focus }: { ctx: FieldContext; spec: PropSpec; focus?: boolean }) {
  switch (spec.type) {
    case 'text':
    case 'raw':
      return <TextField ctx={ctx} spec={spec} focus={focus} />
    case 'bool':
      return <BoolField ctx={ctx} spec={spec} />
    case 'int':
      return <IntField ctx={ctx} spec={spec} />
    case 'multiplicity':
      return <MultiplicityField ctx={ctx} />
    case 'type':
      return <TypeField ctx={ctx} spec={spec} />
    case 'classifier':
      return <ClassifierField ctx={ctx} spec={spec} />
    case 'refs':
      return <RefsField ctx={ctx} spec={spec} />
    case 'opposite':
      return <OppositeField ctx={ctx} />
    case 'keys':
      return <KeysField ctx={ctx} />
    case 'typeParameter':
      return <TypeParameterField ctx={ctx} />
  }
}
