import { ArrowLeftRightIcon, DiamondIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { useEditTarget } from '@/hooks/useEditTarget'
import { useModelEdit } from '@/hooks/useModelEdit'
import { useProblems } from '@/hooks/useProblems'
import { typeElement } from '@/lib/ecore/edit/candidates'
import { pathOf, refId, type ElementRef } from '@/lib/ecore/edit/dom'
import { CONTENTS, groupSpecs } from '@/lib/ecore/edit/contents'
import { KIND_LABEL, kindOf, type NewChildSpec } from '@/lib/ecore/edit/kinds'
import { multiplicityLabel, rowLabel, tokenName, typeLabel } from '@/lib/ecore/edit/labels'
import { refTokens, resolveToken, type RefFile } from '@/lib/ecore/edit/refs'
import { cn } from '@/lib/utils'
import { KindBadge } from './KindBadge'
import { ProblemIcon } from './ProblemIcon'

interface Props {
  el: Element
  target: ElementRef
  file: RefFile
  files: RefFile[]
  docs: ReadonlyMap<string, Document>
}

/** Where a typed element's type is, when it is in an open file, so its name can lead there. */
function typeRef(props: Props, child: Element): ElementRef | null {
  const found = typeElement(props.file, child, props.files, props.docs)
  return found ? { key: found.file.key, path: pathOf(found.el) } : null
}

function ContentRow({ props, child, owner, removable }: { props: Props; child: Element; owner?: string; removable: boolean }) {
  const { setTarget } = useEditTarget()
  const edit = useModelEdit()
  const { byRef } = useProblems()
  const kind = kindOf(child)!
  const ref: ElementRef = { key: props.file.key, path: pathOf(child) }
  const { name, detail } = rowLabel(child)
  const typed = kind === 'EAttribute' || kind === 'EReference' || kind === 'EParameter' || kind === 'EOperation'
  const type = typed ? typeLabel(child) : ''
  const goTo = typed ? typeRef(props, child) : null
  const multiplicity = typed ? multiplicityLabel(child) : ''
  const problems = byRef.get(refId(ref))
  const opposite = child.getAttribute('eOpposite')
  const oppositeName = opposite ? tokenName(opposite) : null

  let trailing: ReactNode = null
  if (kind === 'EOperation') {
    const params = Array.from(child.children).filter((c) => c.localName === 'eParameters').map((p) => typeLabel(p) || '?')
    trailing = <span className="min-w-0 truncate text-muted-foreground">({params.join(', ')})</span>
  } else if (!typed && detail) {
    trailing = <span className="truncate text-muted-foreground">{detail}</span>
  }

  return (
    <li className="group/item">
      {/* The whole row selects on click; its name is the keyboard's way in, and the type is a link of its own. */}
      <div
        onClick={() => setTarget(ref, { center: true })}
        className="flex min-h-7 cursor-default items-center gap-1.5 overflow-hidden rounded-md px-1.5 py-0.5 font-mono text-[12.5px] hover:bg-muted"
      >
        <KindBadge kind={kind} />
        <button
          type="button"
          title={`Edit ${name || KIND_LABEL[kind].toLowerCase()}`}
          onClick={(event) => {
            event.stopPropagation()
            setTarget(ref, { center: true })
          }}
          className={cn(
            'max-w-[60%] flex-none truncate rounded text-left focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
            !name && 'text-muted-foreground italic',
            child.getAttribute('derived') === 'true' && 'italic',
          )}
        >
          {child.getAttribute('derived') === 'true' ? '/' : ''}
          {name || 'unnamed'}
        </button>
        {trailing}
        {typed && type && (
          <>
            <span className="text-muted-foreground">:</span>
            {goTo ? (
              <button
                type="button"
                aria-label={`Go to ${type}`}
                title={`Go to ${type}`}
                onClick={(event) => {
                  event.stopPropagation()
                  setTarget(goTo, { center: true })
                }}
                className="max-w-[45%] flex-none truncate rounded px-0.5 text-primary underline-offset-2 hover:underline"
              >
                {type}
              </button>
            ) : (
              <span className="max-w-[45%] flex-none truncate text-muted-foreground">{type}</span>
            )}
          </>
        )}
        {typed && !type && kind !== 'EOperation' && <span className="text-muted-foreground italic">no type</span>}
        {multiplicity && <span className="flex-none text-muted-foreground">{multiplicity}</span>}
        {child.getAttribute('containment') === 'true' && (
          <DiamondIcon aria-label="containment" className="size-3 flex-none fill-current text-muted-foreground" />
        )}
        {oppositeName && (
          <span title={`Opposite: ${oppositeName}`} className="flex flex-none items-center gap-0.5 text-[11.5px] text-muted-foreground">
            <ArrowLeftRightIcon className="size-3" />
            {oppositeName}
          </span>
        )}
        <span className="flex-1" />
        {owner && <span className="flex-none font-sans text-[11.5px] text-muted-foreground">{owner}</span>}
        {problems && <ProblemIcon severity={problems.some((p) => p.severity === 'error') ? 'error' : 'warning'} />}
        {removable && (
          <Button
            variant="ghost"
            size="icon-xs"
            tabIndex={-1}
            aria-label={`Delete ${name || KIND_LABEL[kind].toLowerCase()}`}
            title="Delete"
            className="size-5 flex-none opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100"
            onClick={(event) => {
              event.stopPropagation()
              // Deleting from the list keeps the panel on the owner rather than moving to a sibling.
              edit.remove(ref)
              setTarget(props.target)
            }}
          >
            <Trash2Icon />
          </Button>
        )}
      </div>
    </li>
  )
}

function GroupHeader({ title, count, specs, onAdd }: { title: string; count: number; specs: NewChildSpec[]; onAdd: (spec: NewChildSpec) => void }) {
  return (
    <div className="mb-1 flex items-center gap-1.5">
      <h3 className="text-[13px] font-semibold">
        {title}
        <small className="ml-1 font-normal text-muted-foreground">{count}</small>
      </h3>
      <span className="flex-1" />
      {specs.map((spec) => (
        <Button
          key={spec.label}
          variant="ghost"
          size="xs"
          aria-label={`Add ${spec.label.toLowerCase()}`}
          title={`Add ${spec.label.toLowerCase()}`}
          onClick={() => onAdd(spec)}
        >
          <PlusIcon />
          {specs.length > 1 && spec.label}
        </Button>
      ))}
    </div>
  )
}

/** An element's contents as lists, so a class shows every feature, not just the attributes its box draws. */
export function ContentsSection(props: Props) {
  const edit = useModelEdit()
  const kind = kindOf(props.el)
  const groups = kind ? CONTENTS[kind] : undefined
  if (!kind || !groups) return null
  const children = Array.from(props.el.children)

  return (
    <>
      {groups.map((group) => {
        const members = children.filter((c) => c.localName === group.tag && (!group.kind || kindOf(c) === group.kind))
        // An empty list that is rarely used, such as subpackages, stays out of the way.
        if (!members.length && group.tag === 'eSubpackages') return null
        return (
          <section key={group.title} className="mt-4">
            <GroupHeader
              title={group.title}
              count={members.length}
              specs={groupSpecs(kind, group)}
              onAdd={(spec) => edit.create(props.target, spec)}
            />
            {members.length ? (
              <ul className="-mx-1.5">
                {members.map((child, i) => (
                  <ContentRow key={i} props={props} child={child} removable />
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-muted-foreground">None yet.</p>
            )}
          </section>
        )
      })}
      {kind === 'EClass' && <InheritedSection {...props} />}
    </>
  )
}

/** Features a class gets from its supertypes in the open files, nearest first, each leading to where it is declared. */
function InheritedSection(props: Props) {
  const lookup = (key: string) => props.docs.get(key) ?? null
  const seen = new Set<Element>([props.el])
  const sources: { file: RefFile; el: Element }[] = []
  const queue: { file: RefFile; el: Element }[] = [{ file: props.file, el: props.el }]
  while (queue.length) {
    const current = queue.shift()!
    for (const token of refTokens(current.el.getAttribute('eSuperTypes'))) {
      const found = resolveToken(current.file, token, props.files, lookup)
      if (!found || seen.has(found.el)) continue
      seen.add(found.el)
      sources.push(found)
      queue.push(found)
    }
  }
  const rows = sources.flatMap((source) =>
    Array.from(source.el.children)
      .filter((c) => c.localName === 'eStructuralFeatures' || c.localName === 'eOperations')
      .map((child) => ({ source, child })),
  )
  if (!rows.length) return null
  return (
    <section className="mt-4">
      <h3 className="mb-1 text-[13px] font-semibold">
        Inherited
        <small className="ml-1 font-normal text-muted-foreground">{rows.length}</small>
      </h3>
      <ul className="-mx-1.5">
        {rows.map(({ source, child }, i) => (
          <ContentRow
            key={i}
            props={{ ...props, file: source.file }}
            child={child}
            owner={source.el.getAttribute('name') ?? ''}
            removable={false}
          />
        ))}
      </ul>
    </section>
  )
}
