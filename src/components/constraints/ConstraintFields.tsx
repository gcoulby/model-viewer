import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { useModelEdit } from '@/hooks/useModelEdit'
import {
  CONSTRAINT_LABELS,
  detailError,
  keysFor,
  setConstraint,
  splitValues,
  type ConstraintDetails,
  type ConstraintKey,
  type ConstraintTarget,
} from '@/lib/constraints'
import { random } from '@/lib/instance/generate'
import { sampleRegex } from '@/lib/instance/sampleRegex'
import { cn } from '@/lib/utils'

export interface ConstraintFieldsProps {
  /** The .ecore file the feature is in. */
  fileKey: string
  /** Finds the feature's element in a fresh copy of that file, for the edit. */
  locate: (doc: Document) => Element | null
  /** Stable for the feature, so typing in one field undoes as one step. */
  featureId: string
  target: ConstraintTarget
  details: ConstraintDetails
  /** The enum's literals, offered as toggles for "allowed values". */
  literals?: string[]
}

const PLACEHOLDER: Partial<Record<ConstraintKey, string>> = {
  minCount: 'any',
  maxCount: 'any',
  pattern: '[A-Z]{2}\\d{4}',
}

/** The constraints a feature can have, each written to the metamodel as it is typed. */
export function ConstraintFields({ fileKey, locate, featureId, target, details, literals }: ConstraintFieldsProps) {
  const edit = useModelEdit()
  const baseId = useId()
  const keys = keysFor(target)
  if (!keys.length) return <p className="text-[12.5px] text-muted-foreground">Nothing to constrain on a single {target.valueKind === 'boolean' ? 'true/false value' : 'reference'}.</p>

  const write = (key: ConstraintKey, value: string) =>
    edit.run(
      `change ${CONSTRAINT_LABELS[key].toLowerCase()}`,
      (d) => {
        const doc = d.doc(fileKey)
        const el = doc && locate(doc)
        if (!el) throw new Error('That feature no longer exists.')
        setConstraint(el, key, value)
      },
      { coalesce: `constraint|${fileKey}|${featureId}|${key}` },
    )

  const field = (key: ConstraintKey) => {
    const id = `${baseId}-${key}`
    const value = details[key] ?? ''
    const error = detailError(key, value, target)
    if (key === 'values' && target.valueKind === 'enum' && literals?.length) {
      const chosen = new Set(splitValues(value))
      return (
        <div key={key} className="col-span-2 grid gap-1">
          <span className="text-xs text-muted-foreground">
            {CONSTRAINT_LABELS[key]} <span className="opacity-70">(none picked = any)</span>
          </span>
          <div className="flex flex-wrap gap-1">
            {literals.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={chosen.has(l)}
                onClick={() => {
                  const next = chosen.has(l) ? [...chosen].filter((v) => v !== l) : [...chosen, l]
                  write(key, literals.filter((x) => next.includes(x)).join(', '))
                }}
                className={cn(
                  'rounded-md border px-1.5 py-0.5 font-mono text-[12px] text-muted-foreground hover:bg-muted',
                  chosen.has(l) && 'border-primary/60 bg-tint text-primary hover:bg-tint',
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )
    }
    const wide = key === 'values' || key === 'pattern'
    const example = key === 'pattern' && value && !error ? sampleRegex(value, random(value.length)) : null
    return (
      <div key={key} className={cn('grid min-w-0 gap-1', wide && 'col-span-2')}>
        <label htmlFor={id} className="text-xs text-muted-foreground">
          {CONSTRAINT_LABELS[key]}
        </label>
        <Input
          id={id}
          value={value}
          type={target.valueKind === 'date' && (key === 'min' || key === 'max') ? 'date' : 'text'}
          inputMode={key === 'minCount' || key === 'maxCount' || ((key === 'min' || key === 'max') && target.valueKind !== 'date') ? 'decimal' : undefined}
          placeholder={key === 'values' ? (target.valueKind === 'int' ? '1, 2, 5' : 'draft, final') : (PLACEHOLDER[key] ?? (key === 'min' || key === 'max' ? 'none' : ''))}
          spellCheck={false}
          aria-invalid={!!error}
          className="h-8 font-mono text-[12.5px]"
          onChange={(e) => write(key, e.target.value)}
        />
        {error ? (
          <span className="text-xs text-destructive">{error}</span>
        ) : example !== null ? (
          <span className="truncate text-xs text-muted-foreground">
            e.g. <span className="font-mono">{example}</span>
          </span>
        ) : null}
      </div>
    )
  }

  return <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">{keys.map(field)}</div>
}
