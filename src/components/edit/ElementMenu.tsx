import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { useModelEdit } from '@/hooks/useModelEdit'
import { pathOf, type ElementRef } from '@/lib/ecore/edit/dom'
import { newChildrenOf, type NewChildSpec } from '@/lib/ecore/edit/kinds'
import { modKey } from '@/lib/keys'

/** The items for adding inside an element, shared by the row's "+" menu and its context menu. */
export function NewChildItems({ specs, onPick }: { specs: NewChildSpec[]; onPick: (spec: NewChildSpec) => void }) {
  return specs.map((spec) => (
    <DropdownMenuItem key={`${spec.tag}|${spec.label}`} onClick={() => onPick(spec)}>
      {spec.label}
    </DropdownMenuItem>
  ))
}

/** A tree row's context menu, as Eclipse's: new child, new sibling, then the structural edits. */
export function ElementMenuItems({ el, target }: { el: Element; target: ElementRef }) {
  const edit = useModelEdit()
  const children = newChildrenOf(el)
  const parent = el.parentElement
  const parentRef = parent ? { key: target.key, path: pathOf(parent) } : null
  // A sibling is anything the parent can hold; the one like this element comes first.
  const siblings = parent
    ? [...newChildrenOf(parent)].sort((a, b) => Number(b.tag === el.localName) - Number(a.tag === el.localName))
    : []
  const root = !target.path.length

  return (
    <>
      {children.length > 0 && (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>New child</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <NewChildItems specs={children} onPick={(spec) => edit.create(target, spec)} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )}
      {parentRef && siblings.length > 0 && (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>New sibling</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <NewChildItems specs={siblings} onPick={(spec) => edit.create(parentRef, spec, target)} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )}
      {!root && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => edit.duplicate(target)}>
            Duplicate
            <DropdownMenuShortcut>{modKey('D')}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!el.previousElementSibling} onClick={() => edit.shift(target, -1)}>
            Move up
            <DropdownMenuShortcut>Alt ↑</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!el.nextElementSibling} onClick={() => edit.shift(target, 1)}>
            Move down
            <DropdownMenuShortcut>Alt ↓</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => edit.remove(target)}>
            Delete
            <DropdownMenuShortcut>Del</DropdownMenuShortcut>
          </DropdownMenuItem>
        </>
      )}
    </>
  )
}
