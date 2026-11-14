import { ChevronsUpDownIcon } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { TypeCandidate } from '@/lib/ecore/edit/candidates'
import type { EKind } from '@/lib/ecore/edit/kinds'
import { cn } from '@/lib/utils'
import { KindBadge } from './KindBadge'

const LIMIT = 150

export interface PickerOption {
  id: string
  name: string
  where: string
  group: string
  candidate: TypeCandidate | null
  badge: EKind
}

interface TypePickerProps {
  label: string
  /** What the trigger shows; empty shows the placeholder. */
  value: string
  placeholder?: string
  options: PickerOption[]
  onPick: (option: PickerOption) => void
  /** Adds a "None" entry that clears the field. */
  onClear?: () => void
  /** Renders the trigger as a small "Add" button rather than a field. */
  trigger?: ReactNode
}

/** A searchable list of types, grouped by where they come from, opened from a field-like button. */
export function TypePicker({ label, value, placeholder = 'Choose a type', options, onPick, onClear, trigger }: TypePickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const list = useRef<HTMLDivElement>(null)

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const hits = needle
      ? options.filter((o) => o.name.toLowerCase().includes(needle) || o.where.toLowerCase().includes(needle))
      : options
    // Names starting with the query come first, as they are the likeliest pick.
    if (needle) hits.sort((a, b) => Number(!a.name.toLowerCase().startsWith(needle)) - Number(!b.name.toLowerCase().startsWith(needle)))
    return hits.slice(0, LIMIT)
  }, [options, query])

  const rows: ({ kind: 'clear' } | { kind: 'option'; option: PickerOption })[] = [
    ...(onClear && !query ? [{ kind: 'clear' as const }] : []),
    ...shown.map((option) => ({ kind: 'option' as const, option })),
  ]

  const choose = (index: number) => {
    const row = rows[index]
    if (!row) return
    if (row.kind === 'clear') onClear?.()
    else onPick(row.option)
    setOpen(false)
  }

  const reveal = (index: number) => {
    list.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' })
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setQuery('')
          setActive(0)
        }
      }}
    >
      <PopoverTrigger
        render={
          trigger ? (
            <Button variant="outline" size="sm" aria-label={label} />
          ) : (
            <Button variant="outline" aria-label={label} className="w-full justify-between font-mono text-[12.5px] font-normal" />
          )
        }
      >
        {trigger ?? (
          <>
            <span className={cn('truncate', !value && 'font-sans text-muted-foreground')}>{value || placeholder}</span>
            <ChevronsUpDownIcon className="text-muted-foreground" />
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="border-b p-1.5">
          <Input
            autoFocus
            value={query}
            placeholder="Search types"
            aria-label={`Search for ${label.toLowerCase()}`}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault()
                const next = Math.max(0, Math.min(rows.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1)))
                setActive(next)
                reveal(next)
              } else if (event.key === 'Enter') {
                event.preventDefault()
                choose(active)
              }
            }}
          />
        </div>
        <div ref={list} role="listbox" aria-label={label} className="max-h-72 overflow-y-auto p-1">
          {!rows.length && <p className="px-2 py-3 text-center text-[12.5px] text-muted-foreground">No types match.</p>}
          {rows.map((row, index) => {
            const previous = rows[index - 1]
            const group = row.kind === 'option' ? row.option.group : null
            const heading = group && (previous?.kind !== 'option' || previous.option.group !== group)
            return (
              <div key={row.kind === 'clear' ? 'clear' : row.option.id}>
                {heading && <p className="px-2 pt-2 pb-1 text-[11px] font-medium text-muted-foreground">{group}</p>}
                <div
                  role="option"
                  aria-selected={index === active}
                  data-index={index}
                  onPointerMove={() => setActive(index)}
                  onClick={() => choose(index)}
                  className={cn(
                    'flex cursor-default items-center gap-2 rounded-md px-2 py-1 text-[13px]',
                    index === active && 'bg-accent text-accent-foreground',
                  )}
                >
                  {row.kind === 'clear' ? (
                    <span className="text-muted-foreground italic">None</span>
                  ) : (
                    <>
                      <KindBadge kind={row.option.badge} />
                      <span className="truncate">{row.option.name}</span>
                      <span className="ml-auto truncate pl-2 text-[11.5px] text-muted-foreground">{row.option.where}</span>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
