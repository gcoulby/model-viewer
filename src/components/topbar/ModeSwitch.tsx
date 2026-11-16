import { BoxesIcon, EyeIcon, PencilIcon } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { EditorMode } from '@/contexts/editor-mode-context'
import { useEditorMode } from '@/hooks/useEditorMode'
import { cn } from '@/lib/utils'

const MODES: { value: EditorMode; label: string; icon: typeof EyeIcon; title: string }[] = [
  { value: 'view', label: 'View', icon: EyeIcon, title: 'Explore the diagram (E)' },
  { value: 'edit', label: 'Edit', icon: PencilIcon, title: 'Change the metamodel (E)' },
  { value: 'instance', label: 'Instance', icon: BoxesIcon, title: 'Make and edit instances of the metamodel (I)' },
]

export function ModeSwitch() {
  const { mode, setMode } = useEditorMode()
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      spacing={0}
      value={[mode]}
      aria-label="Mode"
      className="flex-none"
      onValueChange={(next) => {
        const picked = MODES.find((m) => m.value === next[0])
        if (picked) setMode(picked.value)
      }}
    >
      {MODES.map(({ value, label, icon: Icon, title }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          title={title}
          className={cn(
            'gap-1.5 px-2.5 text-xs text-muted-foreground aria-pressed:text-foreground',
            // Editing is the mode that changes files, so it is marked more strongly than viewing.
            value !== 'view' && 'aria-pressed:bg-tint aria-pressed:text-primary',
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
