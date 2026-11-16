import { ChevronRightIcon, PlusIcon } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react'
import { FileHeader } from '@/components/edit/EditTree'
import { ProblemIcon } from '@/components/edit/ProblemIcon'
import { ClassifierIcon } from '@/components/sidebar/ClassifierIcon'
import { Button } from '@/components/ui/button'
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useConfirmClose } from '@/hooks/useConfirmClose'
import { useEditTarget } from '@/hooks/useEditTarget'
import { useInstanceEdit } from '@/hooks/useInstanceEdit'
import { useInstances } from '@/hooks/useInstances'
import { useModels } from '@/hooks/useModels'
import { useProblems } from '@/hooks/useProblems'
import { elementAt, pathOf, refId, sameRef, type ElementRef } from '@/lib/ecore/edit/dom'
import { modKey, restoreFocusUnlessTyping } from '@/lib/keys'
import { addableChildren } from '@/lib/instance/children'
import { conforms, type MetaClass, type MetaFeature, type Metamodel } from '@/lib/instance/metamodel'
import type { InstanceFile } from '@/lib/instance/objectGraph'
import { childObjects, classOf, isRoot, labelOf, objectPath, rootObjects } from '@/lib/instance/xmi'
import { cn } from '@/lib/utils'
import { ClassMenuItems, NewInstanceButton } from './NewInstanceButton'

const INDENT = 14

/** "New child" items: one list when only one feature can take children, otherwise a submenu per feature. */
export function NewObjectItems({ meta, el, onPick }: { meta: Metamodel; el: Element; onPick: (feature: string, cls: MetaClass) => void }) {
  const groups = addableChildren(meta, el)
  const item = (feature: MetaFeature, cls: MetaClass) => (
    <DropdownMenuItem key={`${feature.name}|${cls.id}`} onClick={() => onPick(feature.name, cls)}>
      <ClassBadge meta={meta} cls={cls} />
      {cls.name}
    </DropdownMenuItem>
  )
  if (groups.length === 1) {
    const [only] = groups
    return (
      <DropdownMenuGroup>
        <DropdownMenuLabel>{only!.feature.name}</DropdownMenuLabel>
        {only!.classes.map((cls) => item(only!.feature, cls))}
      </DropdownMenuGroup>
    )
  }
  return groups.map(({ feature, classes }) => (
    <DropdownMenuSub key={feature.name}>
      <DropdownMenuSubTrigger>{feature.name}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-52">{classes.map((cls) => item(feature, cls))}</DropdownMenuSubContent>
    </DropdownMenuSub>
  ))
}

export function ClassBadge({ meta, cls }: { meta: Metamodel; cls: MetaClass | null }) {
  const node = cls ? meta.graph.nodes.get(cls.id) : undefined
  if (node) return <ClassifierIcon node={node} />
  return (
    <i className="inline-grid size-[17px] flex-none place-items-center rounded-[4px] font-mono text-[10.5px] text-muted-foreground not-italic shadow-[inset_0_0_0_1px_var(--border)]">
      ?
    </i>
  )
}

/** The objects in every open instance file, as Eclipse's reflective editor shows them. */
export function InstanceTree({ query }: { query: string }) {
  const { meta, instanceFiles } = useInstances()
  const { files } = useModels()
  const { target, element } = useEditTarget()
  const { requestClose, dialog } = useConfirmClose()
  const [open, setOpenState] = useState<ReadonlyMap<string, boolean>>(new Map())
  const keyboard = useRef(false)
  const needle = query.trim().toLowerCase()

  // The target's ancestors open whenever the target changes, wherever it was chosen.
  const [shown, setShown] = useState(element)
  if (element !== shown) {
    setShown(element)
    if (target && element) {
      const keys: string[] = []
      for (let up = element.parentElement; up; up = up.parentElement) keys.push(`${target.key}|${objectPath(up)}`)
      if (keys.some((k) => open.get(k) !== true)) setOpenState(new Map([...open, ...keys.map((k) => [k, true] as const)]))
    }
  }

  if (!meta) return null
  if (!instanceFiles.length) {
    return (
      <div className="grid gap-2.5 px-3.5 py-2 text-muted-foreground">
        <p>No instances yet. Start one from a class in the open metamodels.</p>
        <div>
          <NewInstanceButton />
        </div>
      </div>
    )
  }

  const isOpen = (key: string, fallback: boolean) => open.get(key) ?? fallback
  const setOpen = (key: string, value: boolean) => setOpenState((prev) => new Map(prev).set(key, value))
  const matches = (el: Element): boolean => {
    if (!needle) return true
    const { name, className } = labelOf(meta, el)
    return `${name} ${className}`.toLowerCase().includes(needle) || childObjects(meta, el).some(matches)
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div
        role="tree"
        aria-label="Instances"
        className="p-1.5 pb-2.5"
        onKeyDown={() => {
          keyboard.current = true
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) keyboard.current = false
        }}
      >
        {instanceFiles.map((file) => (
          <div key={file.key} className="mb-1.5">
            {(() => {
              const workspaceFile = files.find((f) => f.key === file.key)
              return workspaceFile && <FileHeader file={workspaceFile} onClose={() => requestClose(file.key)} actions={<AddRootButton fileKey={file.key} fileName={file.name} />} />
            })()}
            {rootObjects(file.doc)
              .filter(matches)
              .map((root, i) => (
                <ObjectNode key={i} meta={meta} file={file} el={root} depth={0} isOpen={isOpen} setOpen={setOpen} matches={matches} searching={!!needle} keyboard={keyboard} />
              ))}
          </div>
        ))}
      </div>
      {dialog}
    </ScrollArea>
  )
}

/** Adds another root object to a file, beside the ones there, for objects nothing in the file contains. */
function AddRootButton({ fileKey, fileName }: { fileKey: string; fileName: string }) {
  const edit = useInstanceEdit()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-xs" className="size-6" aria-label={`Add an object to ${fileName}`} title={`Add an object to ${fileName}`} />}
      >
        <PlusIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64" finalFocus={restoreFocusUnlessTyping}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal text-muted-foreground">A new root object in {fileName}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <ClassMenuItems onPick={(cls) => edit.createRoot(fileKey, cls)} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface NodeProps {
  meta: Metamodel
  file: InstanceFile
  el: Element
  depth: number
  isOpen: (key: string, fallback: boolean) => boolean
  setOpen: (key: string, open: boolean) => void
  matches: (el: Element) => boolean
  searching: boolean
  keyboard: React.RefObject<boolean>
}

function ObjectNode(props: NodeProps) {
  const { meta, file, el, depth, isOpen, matches, searching } = props
  const key = `${file.key}|${objectPath(el)}`
  const kids = childObjects(meta, el).filter(matches)
  // Roots start open so a file shows its contents; deeper objects start closed.
  const open = searching || isOpen(key, depth === 0)
  return (
    <>
      <ObjectRow {...props} openKey={key} open={open} hasChildren={kids.length > 0} />
      {open && kids.map((child, i) => <ObjectNode key={i} {...props} el={child} depth={depth + 1} />)}
    </>
  )
}

type DropMode = 'before' | 'into' | 'after'
const drag: { ref: ElementRef | null } = { ref: null }

function ObjectRow({ meta, file, el, depth, setOpen, keyboard, openKey: key, open, hasChildren }: NodeProps & { openKey: string; open: boolean; hasChildren: boolean }) {
  const { target, setTarget } = useEditTarget()
  const edit = useInstanceEdit()
  const { byRef, within } = useProblems()
  const row = useRef<HTMLDivElement>(null)
  const [drop, setDrop] = useState<DropMode | null>(null)
  const ref: ElementRef = { key: file.key, path: pathOf(el) }
  const selected = sameRef(target, ref)
  const cls = classOf(meta, el)
  const { name, className } = labelOf(meta, el)
  const own = byRef.get(refId(ref))
  const worst = own && (own.some((p) => p.severity === 'error') ? 'error' : 'warning')
  const inside = !own && !open && within.has(refId(ref))
  const addable = addableChildren(meta, el)
  const root = isRoot(el)
  const roots = root ? rootObjects(file.doc).length : 0

  useEffect(() => {
    if (!selected || !row.current) return
    row.current.scrollIntoView({ block: 'nearest' })
    if (keyboard.current) row.current.focus({ preventScroll: true })
  }, [selected, keyboard])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.metaKey || event.ctrlKey) return
    const rows = Array.from(event.currentTarget.closest('[role="tree"]')?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [])
    const at = rows.indexOf(event.currentTarget)
    if (event.key === 'ArrowDown') rows[at + 1]?.click()
    else if (event.key === 'ArrowUp') rows[at - 1]?.click()
    else if (event.key === 'ArrowRight' && hasChildren) {
      if (open) rows[at + 1]?.click()
      else setOpen(key, true)
    }
    else if (event.key === 'ArrowLeft') {
      if (open && hasChildren) setOpen(key, false)
      else if (!root) setTarget({ key: file.key, path: ref.path.slice(0, -1) })
    } else return
    event.preventDefault()
  }

  const dropModeAt = (event: DragEvent<HTMLDivElement>): DropMode | null => {
    if (!drag.ref || drag.ref.key !== file.key) return null
    const dragged = elementAt(file.doc, drag.ref.path)
    const draggedClass = dragged && classOf(meta, dragged)
    if (!dragged || !draggedClass || dragged === el || dragged.contains(el)) return null
    const accepts = (container: Element | null) => {
      const feature = container && classOf(meta, container)?.features.find((f) => f.name === dragged.localName)
      return !!feature?.containment && conforms(meta, draggedClass.id, feature.typeId)
    }
    const asSibling = !root && el.localName === dragged.localName && accepts(el.parentElement)
    const into = accepts(el) && dragged.parentElement !== el
    const box = event.currentTarget.getBoundingClientRect()
    const y = (event.clientY - box.top) / box.height
    if (asSibling && y < 0.3) return 'before'
    if (asSibling && y > 0.7) return 'after'
    if (into) return 'into'
    return asSibling ? (y < 0.5 ? 'before' : 'after') : null
  }

  const menu: ReactNode = (
    <>
      {addable.length > 0 && (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>New child</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52">
            <NewObjectItems meta={meta} el={el} onPick={(feature, c) => edit.create(ref, feature, c)} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )}
      {root && (
        <>
          {addable.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>New root object</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-64">
              <ClassMenuItems onPick={(cls) => edit.createRoot(file.key, cls)} />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </>
      )}
      {(!root || roots > 1) && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => edit.duplicate(ref)}>
            Duplicate
            <DropdownMenuShortcut>{modKey('D')}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => edit.shift(ref, -1)}>
            Move up
            <DropdownMenuShortcut>Alt ↑</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => edit.shift(ref, 1)}>
            Move down
            <DropdownMenuShortcut>Alt ↓</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => edit.remove(ref)}>
            Delete
            <DropdownMenuShortcut>Del</DropdownMenuShortcut>
          </DropdownMenuItem>
        </>
      )}
    </>
  )

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <div
            ref={row}
            role="treeitem"
            aria-selected={selected}
            aria-expanded={hasChildren ? open : undefined}
            aria-level={depth + 1}
            tabIndex={selected ? 0 : -1}
            draggable={!root}
            title={root ? 'A root object of the file' : `${el.localName} of its parent`}
            onClick={() => setTarget(ref, { center: true })}
            onDoubleClick={() => (hasChildren ? setOpen(key, !open) : setTarget(ref, { focusName: true }))}
            onContextMenu={() => setTarget(ref)}
            onKeyDown={onKeyDown}
            onDragStart={(event) => {
              drag.ref = ref
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', name || className)
            }}
            onDragEnd={() => {
              drag.ref = null
            }}
            onDragOver={(event) => {
              const mode = dropModeAt(event)
              if (!mode) return
              event.preventDefault()
              event.stopPropagation()
              setDrop(mode)
            }}
            onDragLeave={() => setDrop(null)}
            onDrop={(event) => {
              const mode = dropModeAt(event)
              setDrop(null)
              if (!mode || !drag.ref) return
              event.preventDefault()
              const parent = mode === 'into' ? el : el.parentElement!
              const before = mode === 'before' ? el : mode === 'after' ? el.nextElementSibling : null
              edit.move(drag.ref, { key: file.key, path: pathOf(parent) }, before ? { key: file.key, path: pathOf(before) } : null)
              drag.ref = null
            }}
            style={{ paddingLeft: depth * INDENT + 2 }}
            className={cn(
              'group/row relative flex cursor-default items-center gap-1.5 rounded-md py-[2px] pr-0.5 outline-none select-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50',
              selected && 'bg-tint shadow-[inset_2px_0_0_var(--primary)] hover:bg-tint',
              drop === 'into' && 'ring-2 ring-primary/60',
              drop === 'before' && 'shadow-[inset_0_2px_0_var(--primary)]',
              drop === 'after' && 'shadow-[inset_0_-2px_0_var(--primary)]',
            )}
          />
        }
      >
        <button
          type="button"
          tabIndex={-1}
          aria-hidden={!hasChildren}
          onClick={(event) => {
            event.stopPropagation()
            if (hasChildren) setOpen(key, !open)
          }}
          className={cn('flex-none rounded p-0.5 hover:bg-background/60', !hasChildren && 'invisible')}
        >
          <ChevronRightIcon className={cn('size-3.5 text-muted-foreground transition-transform', open && 'rotate-90')} />
        </button>
        <ClassBadge meta={meta} cls={cls} />
        <span className={cn('min-w-0 truncate', !name && 'text-muted-foreground italic')}>{name || 'unnamed'}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-muted-foreground">: {className}</span>
        {worst && (
          <span title={own!.map((p) => p.message).join('\n')} className="flex-none">
            <ProblemIcon severity={worst} />
          </span>
        )}
        {inside && <span title="Something inside has a problem" className="mx-1 size-1.5 flex-none rounded-full bg-destructive/70" />}
        {addable.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  tabIndex={-1}
                  aria-label={`Add inside ${name || className}`}
                  className={cn('size-5 flex-none opacity-0 group-hover/row:opacity-100 data-popup-open:opacity-100', selected && 'opacity-100')}
                  onClick={(event) => event.stopPropagation()}
                />
              }
            >
              <PlusIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52" finalFocus={restoreFocusUnlessTyping}>
              <NewObjectItems meta={meta} el={el} onPick={(feature, c) => edit.create(ref, feature, c)} />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </ContextMenuTrigger>
      <ContextMenuContent finalFocus={restoreFocusUnlessTyping}>{menu}</ContextMenuContent>
    </ContextMenu>
  )
}
