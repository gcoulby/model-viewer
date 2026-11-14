import { ChevronRightIcon, DownloadIcon, FileIcon, PlusIcon, XIcon } from 'lucide-react'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useConfirmClose } from '@/hooks/useConfirmClose'
import { useDiagram } from '@/hooks/useDiagram'
import { useEditTarget } from '@/hooks/useEditTarget'
import { useModelEdit } from '@/hooks/useModelEdit'
import { useModels } from '@/hooks/useModels'
import { useWorkspaceDocs } from '@/hooks/useWorkspaceDocs'
import { elementAt, pathOf, refId, sameRef, type ElementRef } from '@/lib/ecore/edit/dom'
import { canContain, kindOf, newChildrenOf } from '@/lib/ecore/edit/kinds'
import { rowLabel } from '@/lib/ecore/edit/labels'
import { graphIdOf } from '@/lib/ecore/edit/refs'
import { downloadFiles } from '@/lib/workspace/save'
import type { WorkspaceFile } from '@/lib/workspace/workspace'
import { cn } from '@/lib/utils'
import { ElementMenuItems, NewChildItems } from './ElementMenu'
import { KindBadge } from './KindBadge'

const INDENT = 14

/** A row's key for remembering whether it is open: its file and the names on its way down, so edits keep it. */
function openKey(fileKey: string, el: Element): string {
  const parts: string[] = []
  for (let current: Element | null = el; current; current = current.parentElement) {
    const id = current.getAttribute('name') ?? current.getAttribute('source') ?? current.getAttribute('key')
    const index = current.parentElement ? Array.prototype.indexOf.call(current.parentElement.children, current) : 0
    parts.unshift(`${current.localName}:${id ?? `#${index}`}`)
  }
  return `${fileKey}|${parts.join('/')}`
}

const shownChildren = (el: Element) => Array.from(el.children).filter((c) => kindOf(c) !== null)

/** Elements whose label matches the query, with everything above them so they can be reached. */
function matching(docs: ReadonlyMap<string, Document>, query: string): Set<Element> {
  const hits = new Set<Element>()
  for (const doc of docs.values()) {
    const stack: Element[] = [doc.documentElement]
    while (stack.length) {
      const el = stack.pop()!
      const { name, detail } = rowLabel(el)
      if (kindOf(el) && `${name} ${detail}`.toLowerCase().includes(query)) {
        for (let up: Element | null = el; up && !hits.has(up); up = up.parentElement) hits.add(up)
      }
      stack.push(...Array.from(el.children))
    }
  }
  return hits
}

type DropMode = 'before' | 'into' | 'after'

/**
 * Shared by every row: the row being dragged, and whether the tree is being driven from the keyboard, in
 * which case the targeted row takes focus as it moves.
 */
interface Gesture {
  dragging: ElementRef | null
  keyboard: boolean
}
/** Rows report gestures through these, so the tree that owns the state is the only one changing it. */
interface GestureApi {
  read: () => Gesture
  set: (change: Partial<Gesture>) => void
}
const GestureContext = createContext<GestureApi | null>(null)

interface TreeContext {
  fileKey: string
  index: number
  doc: Document
  filter: Set<Element> | null
  isOpen: (key: string, fallback: boolean) => boolean
  setOpen: (key: string, open: boolean) => void
}

/** The containment tree of every open file, for editing: everything Ecore holds, down to generic types. */
export function EditTree({ query }: { query: string }) {
  const { files } = useModels()
  const docs = useWorkspaceDocs()
  const { target, element } = useEditTarget()
  const [open, setOpenState] = useState<ReadonlyMap<string, boolean>>(new Map())
  const { requestClose, dialog } = useConfirmClose()
  const gestureRef = useRef<Gesture>({ dragging: null, keyboard: false })
  const gesture = useMemo<GestureApi>(
    () => ({
      read: () => gestureRef.current,
      set: (change) => {
        gestureRef.current = { ...gestureRef.current, ...change }
      },
    }),
    [],
  )
  const needle = query.trim().toLowerCase()
  const filter = useMemo(() => (needle ? matching(docs, needle) : null), [docs, needle])

  // Whatever is targeted, from the diagram or the panel, is shown: every row above it opens. This follows
  // the target as it changes, so a row the user closes afterwards stays closed.
  const [shownTarget, setShownTarget] = useState(element)
  if (element !== shownTarget) {
    setShownTarget(element)
    if (target && element) {
      const keys: string[] = []
      for (let up = element.parentElement; up; up = up.parentElement) keys.push(openKey(target.key, up))
      if (keys.some((k) => open.get(k) === false || !open.has(k))) {
        setOpenState(new Map([...open, ...keys.map((k) => [k, true] as const)]))
      }
    }
  }

  const isOpen = (key: string, fallback: boolean) => open.get(key) ?? fallback
  const setOpen = (key: string, value: boolean) => setOpenState((prev) => new Map(prev).set(key, value))

  if (!files.length) {
    return <p className="px-3.5 py-2 text-muted-foreground">Open a file, or start a new model from the File menu.</p>
  }

  return (
    <GestureContext.Provider value={gesture}>
    <ScrollArea className="min-h-0 flex-1">
      <div
        role="tree"
        aria-label="Model contents"
        className="p-1.5 pb-2.5"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) gesture.set({ keyboard: false })
        }}
      >
        {files.map((file) => {
          const doc = docs.get(file.key)
          if (!doc) return null
          const roots = doc.documentElement.localName === 'EPackage' ? [doc.documentElement] : shownChildren(doc.documentElement)
          const ctx: TreeContext = { fileKey: file.key, index: file.index, doc, filter, isOpen, setOpen }
          if (filter && !roots.some((r) => filter.has(r))) return null
          return (
            <div key={file.key} className="mb-1.5">
              <FileHeader file={file} onClose={() => requestClose(file.key)} />
              {roots.map((root, i) => (
                <TreeNode key={i} el={root} depth={0} ctx={ctx} />
              ))}
            </div>
          )
        })}
      </div>
      {dialog}
    </ScrollArea>
    </GestureContext.Provider>
  )
}

function FileHeader({ file, onClose }: { file: WorkspaceFile; onClose: () => void }) {
  const { dirtyKeys, markSaved } = useModels()
  const unsaved = dirtyKeys.has(file.key)
  return (
    <div className="group/file flex items-center gap-1.5 rounded-md py-0.5 pr-0.5 pl-1.5 text-muted-foreground">
      <FileIcon className="size-3.5 flex-none" />
      <span className="min-w-0 truncate font-mono text-[11.5px]">{file.name}</span>
      {unsaved && (
        <span title="Unsaved changes" className="size-1.5 flex-none rounded-full bg-primary">
          <span className="sr-only">(unsaved changes)</span>
        </span>
      )}
      <span className="flex-1" />
      <Button
        variant="ghost"
        size="icon-xs"
        className="size-6 opacity-0 group-hover/file:opacity-100 focus-visible:opacity-100"
        aria-label={`Download ${file.name}`}
        title="Download this file"
        onClick={async () => {
          await downloadFiles([file])
          markSaved([file.key])
        }}
      >
        <DownloadIcon />
      </Button>
      <Button variant="ghost" size="icon-xs" className="size-6" aria-label={`Close ${file.name}`} title="Close file" onClick={onClose}>
        <XIcon />
      </Button>
    </div>
  )
}

function TreeNode({ el, depth, ctx }: { el: Element; depth: number; ctx: TreeContext }) {
  const kind = kindOf(el)
  if (!kind || (ctx.filter && !ctx.filter.has(el))) return null
  const key = openKey(ctx.fileKey, el)
  const kids = shownChildren(el).filter((c) => !ctx.filter || ctx.filter.has(c))
  // Packages start open, so a file shows its types straight away; everything else starts closed.
  const open = !!ctx.filter || ctx.isOpen(key, kind === 'EPackage')
  return (
    <>
      <TreeRow el={el} depth={depth} ctx={ctx} openKey={key} open={open} hasChildren={kids.length > 0} />
      {open && kids.map((child, i) => <TreeNode key={i} el={child} depth={depth + 1} ctx={ctx} />)}
    </>
  )
}

interface TreeRowProps {
  el: Element
  depth: number
  ctx: TreeContext
  openKey: string
  open: boolean
  hasChildren: boolean
}

function TreeRow({ el, depth, ctx, openKey: key, open, hasChildren }: TreeRowProps) {
  const { target, setTarget } = useEditTarget()
  const { graph } = useDiagram()
  const edit = useModelEdit()
  const row = useRef<HTMLDivElement>(null)
  const gesture = useContext(GestureContext)!
  const [drop, setDrop] = useState<DropMode | null>(null)
  const kind = kindOf(el)!
  const ref: ElementRef = { key: ctx.fileKey, path: pathOf(el) }
  const selected = sameRef(target, ref)
  const { name, detail } = rowLabel(el)
  const node = graph?.nodes.get(graphIdOf(ctx.index, el) ?? '')
  const specs = newChildrenOf(el)

  useEffect(() => {
    if (!selected || !row.current) return
    row.current.scrollIntoView({ block: 'nearest' })
    if (gesture.read().keyboard) row.current.focus({ preventScroll: true })
  }, [selected, gesture])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.metaKey || event.ctrlKey) return
    gesture.set({ keyboard: true })
    const rows = Array.from(event.currentTarget.closest('[role="tree"]')?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [])
    const at = rows.indexOf(event.currentTarget)
    const go = (index: number) => rows[index]?.click()
    if (event.key === 'ArrowDown') go(at + 1)
    else if (event.key === 'ArrowUp') go(at - 1)
    else if (event.key === 'ArrowRight' && hasChildren) {
      if (open) go(at + 1)
      else ctx.setOpen(key, true)
    } else if (event.key === 'ArrowLeft') {
      if (open && hasChildren) ctx.setOpen(key, false)
      else if (el.parentElement && ref.path.length) setTarget({ key: ctx.fileKey, path: ref.path.slice(0, -1) })
    } else return
    event.preventDefault()
  }

  const dropModeAt = (event: DragEvent<HTMLDivElement>): DropMode | null => {
    const { dragging } = gesture.read()
    if (!dragging || dragging.key !== ctx.fileKey) return null
    const dragged = elementAt(ctx.doc, dragging.path)
    if (!dragged || dragged === el || dragged.contains(el)) return null
    const box = event.currentTarget.getBoundingClientRect()
    const y = (event.clientY - box.top) / box.height
    const asSibling = !!el.parentElement && ref.path.length > 0 && canContain(el.parentElement, dragged.localName)
    const into = canContain(el, dragged.localName) && dragged.parentElement !== el
    if (asSibling && y < 0.3) return 'before'
    if (asSibling && y > 0.7) return 'after'
    if (into) return 'into'
    return asSibling ? (y < 0.5 ? 'before' : 'after') : null
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    const mode = dropModeAt(event)
    setDrop(null)
    const { dragging } = gesture.read()
    if (!mode || !dragging) return
    event.preventDefault()
    const parent = mode === 'into' ? el : el.parentElement!
    const before = mode === 'before' ? el : mode === 'after' ? el.nextElementSibling : null
    edit.move(dragging, { key: ctx.fileKey, path: pathOf(parent) }, before ? { key: ctx.fileKey, path: pathOf(before) } : null)
    gesture.set({ dragging: null })
  }

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
            data-ref={refId(ref)}
            tabIndex={selected ? 0 : -1}
            draggable={ref.path.length > 0}
            onClick={() => setTarget(ref, { center: true })}
            onDoubleClick={() => (hasChildren ? ctx.setOpen(key, !open) : setTarget(ref, { focusName: true }))}
            onContextMenu={() => setTarget(ref)}
            onKeyDown={onKeyDown}
            onDragStart={(event) => {
              gesture.set({ dragging: ref })
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', name)
            }}
            onDragEnd={() => {
              gesture.set({ dragging: null })
            }}
            onDragOver={(event) => {
              const mode = dropModeAt(event)
              if (!mode) return
              event.preventDefault()
              event.stopPropagation()
              setDrop(mode)
            }}
            onDragLeave={() => setDrop(null)}
            onDrop={onDrop}
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
            if (hasChildren) ctx.setOpen(key, !open)
          }}
          className={cn('flex-none rounded p-0.5 hover:bg-background/60', !hasChildren && 'invisible')}
        >
          <ChevronRightIcon className={cn('size-3.5 text-muted-foreground transition-transform', open && 'rotate-90')} />
        </button>
        <KindBadge kind={kind} node={node} />
        <span className={cn('min-w-0 truncate', !name && 'text-muted-foreground italic', kind === 'EClass' && el.getAttribute('abstract') === 'true' && 'italic')}>
          {name || 'unnamed'}
        </span>
        {detail && <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-muted-foreground">{detail}</span>}
        {!detail && <span className="flex-1" />}
        {specs.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  tabIndex={-1}
                  aria-label={`Add inside ${name || 'this element'}`}
                  className={cn('size-5 flex-none opacity-0 group-hover/row:opacity-100 data-popup-open:opacity-100', selected && 'opacity-100')}
                  onClick={(event) => event.stopPropagation()}
                />
              }
            >
              <PlusIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <NewChildItems specs={specs} onPick={(spec) => edit.create(ref, spec)} />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ElementMenuItems el={el} target={ref} />
      </ContextMenuContent>
    </ContextMenu>
  )
}
