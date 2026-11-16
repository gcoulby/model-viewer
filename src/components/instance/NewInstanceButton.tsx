import { BoxIcon, ChevronDownIcon } from 'lucide-react'
import { ClassifierIcon } from '@/components/sidebar/ClassifierIcon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEditTarget } from '@/hooks/useEditTarget'
import { useInstances } from '@/hooks/useInstances'
import { useModels } from '@/hooks/useModels'
import type { MetaClass } from '@/lib/instance/metamodel'
import { newInstanceText } from '@/lib/instance/xmi'
import { focusGoesToField, restoreFocusUnlessTyping } from '@/lib/keys'

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

function ClassItem({ cls, onPick }: { cls: MetaClass; onPick: (cls: MetaClass) => void }) {
  const { meta } = useInstances()
  const node = meta?.graph.nodes.get(cls.id)
  return (
    <DropdownMenuItem onClick={() => onPick(cls)}>
      {node && <ClassifierIcon node={node} />}
      {cls.name}
      <span className="ml-auto pl-3 text-xs text-muted-foreground">{cls.fileName}</span>
    </DropdownMenuItem>
  )
}

/** The concrete classes of the open metamodels, the usual roots (classes nothing contains) first. */
export function ClassMenuItems({ onPick }: { onPick: (cls: MetaClass) => void }) {
  const { meta } = useInstances()
  const concrete = meta ? [...meta.classes.values()].filter((c) => !c.abstract).sort((a, b) => a.name.localeCompare(b.name)) : []
  const roots = meta?.roots ?? []
  const others = concrete.filter((c) => !roots.includes(c))
  return (
    <>
      {roots.length > 0 && (
        <DropdownMenuGroup>
          <DropdownMenuLabel>Root classes</DropdownMenuLabel>
          {roots.map((cls) => (
            <ClassItem key={cls.id} cls={cls} onPick={onPick} />
          ))}
        </DropdownMenuGroup>
      )}
      {others.length > 0 && (
        <>
          {roots.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Other classes</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-80 w-64 overflow-y-auto">
              {others.map((cls) => (
                <ClassItem key={cls.id} cls={cls} onPick={onPick} />
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </>
      )}
    </>
  )
}

/**
 * Starts a new instance file: a root object of the chosen class, linked to its metamodel. The classes nothing
 * contains come first, as they are the usual roots, as Eclipse's Create Dynamic Instance would start from.
 */
export function NewInstanceButton({ variant = 'outline' }: { variant?: 'outline' | 'default' }) {
  const { meta } = useInstances()
  const { createFile } = useModels()
  const { setTarget } = useEditTarget()
  const any = !!meta && [...meta.classes.values()].some((c) => !c.abstract)

  const create = (cls: MetaClass) => {
    focusGoesToField()
    const named = cls.features.some((f) => f.name === 'name' && f.kind === 'attribute' && !f.many && f.valueKind === 'string')
    const key = createFile(lowerFirst(cls.name), '.xmi', newInstanceText(cls, cls.fileName, named ? `${lowerFirst(cls.name)}1` : null))
    setTarget({ key, path: [] }, { center: true, focusName: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant={variant} disabled={!any} title={any ? 'Start a new instance file' : 'Open a metamodel first'} />}
      >
        <BoxIcon />
        New instance
        <ChevronDownIcon className="opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72" finalFocus={restoreFocusUnlessTyping}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal text-muted-foreground">A new .xmi file, starting from…</DropdownMenuLabel>
        </DropdownMenuGroup>
        <ClassMenuItems onPick={create} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
