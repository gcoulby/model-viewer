import { DicesIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { LabelledCheckbox } from '@/components/sidebar/LabelledCheckbox'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useEditTarget } from '@/hooks/useEditTarget'
import { useInstances } from '@/hooks/useInstances'
import { useModels } from '@/hooks/useModels'
import { generateInstance, SIZES, type GenerateSize } from '@/lib/instance/generate'
import { ClassBadge } from './InstanceTree'

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const newSeed = () => Math.floor(Math.random() * 100_000)
const SIZE_LABEL: Record<GenerateSize, string> = { small: 'Small', medium: 'Medium', large: 'Large' }

/**
 * Generate instance: a new .xmi file filled in from a root class, as a starting point or test data. It is
 * an option beside starting an empty instance, never what New instance does by itself.
 */
export function GenerateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{open && <GenerateForm onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  )
}

function GenerateForm({ onDone }: { onDone: () => void }) {
  const { meta } = useInstances()
  const { createFile } = useModels()
  const { setTarget } = useEditTarget()
  const concrete = meta ? [...meta.classes.values()].filter((c) => !c.abstract).sort((a, b) => a.name.localeCompare(b.name)) : []
  const roots = meta?.roots ?? []
  const others = concrete.filter((c) => !roots.includes(c))
  const [rootId, setRootId] = useState<string | null>((roots[0] ?? concrete[0])?.id ?? null)
  const [size, setSize] = useState<GenerateSize>('small')
  const [optional, setOptional] = useState(true)
  const [seed, setSeed] = useState(newSeed)
  const constrained = concrete.reduce((n, c) => n + c.features.filter((f) => f.declaredIn === c.id && Object.keys(f.constraints).length).length, 0)
  const root = rootId ? meta?.classes.get(rootId) : undefined

  const generate = () => {
    if (!meta || !root) return
    const result = generateInstance(meta, { root, size, optional, seed })
    const key = createFile(`${lowerFirst(root.name)}-generated`, '.xmi', result.text)
    setTarget({ key, path: result.text.includes('<xmi:XMI') ? [0] : [] }, { center: true })
    toast.success(`Generated ${result.objects} object${result.objects === 1 ? '' : 's'}`, {
      description: result.capped ? `Stopped at the ${SIZE_LABEL[size].toLowerCase()} limit of ${SIZES[size].cap}; Problems lists anything still missing.` : `Seed ${seed}. Generate again with the same seed for the same model.`,
    })
    onDone()
  }

  const item = (id: string) => {
    const c = meta!.classes.get(id)!
    return (
      <SelectItem key={id} value={id}>
        <ClassBadge meta={meta!} cls={c} />
        {c.name}
      </SelectItem>
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Generate instance</DialogTitle>
        <DialogDescription className="text-[12.5px]">
          A new .xmi file filled in from the metamodel: contained objects, values and references, keeping to multiplicities
          {constrained ? ` and ${constrained} constrained feature${constrained === 1 ? '' : 's'}` : ' and any constraints'}.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <span className="text-xs text-muted-foreground">Root object</span>
          <Select value={rootId} onValueChange={(v) => typeof v === 'string' && setRootId(v)} items={concrete.map((c) => ({ value: c.id, label: c.name }))}>
            <SelectTrigger className="w-full" aria-label="Root class">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roots.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Root classes</SelectLabel>
                  {roots.map((c) => item(c.id))}
                </SelectGroup>
              )}
              {others.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Other classes</SelectLabel>
                  {others.map((c) => item(c.id))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs text-muted-foreground">Size</span>
          <ToggleGroup variant="outline" size="sm" spacing={0} value={[size]} onValueChange={(v) => v[0] && setSize(v[0] as GenerateSize)} aria-label="Size">
            {(Object.keys(SIZES) as GenerateSize[]).map((s) => (
              <ToggleGroupItem key={s} value={s} className="flex-1 text-xs" title={`Up to ${SIZES[s].many} per list, ${SIZES[s].cap} objects in all`}>
                {SIZE_LABEL[s]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <LabelledCheckbox label="Fill optional features too" checked={optional} onChange={setOptional} title="Off: only what multiplicities and constraints require" />
        <div className="grid gap-1.5">
          <label htmlFor="generate-seed" className="text-xs text-muted-foreground">
            Seed
          </label>
          <div className="flex gap-1.5">
            <Input id="generate-seed" inputMode="numeric" value={String(seed)} onChange={(e) => setSeed(Number(e.target.value.replace(/\D/g, '')) || 0)} className="font-mono" />
            <Button variant="outline" size="icon" aria-label="New seed" title="New seed" onClick={() => setSeed(newSeed())}>
              <DicesIcon />
            </Button>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={generate} disabled={!root}>
          Generate
        </Button>
      </DialogFooter>
    </>
  )
}
