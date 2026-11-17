import { Redo2Icon, SaveIcon, Undo2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useModels } from '@/hooks/useModels'
import { useSaveFiles } from '@/hooks/useSaveFiles'
import { modKey } from '@/lib/keys'
import { ConstraintsButton } from '@/components/constraints/ConstraintsManager'
import { FileMenu } from './FileMenu'
import { IconAction } from './IconAction'
import { NewModelButton } from './NewModelButton'
import { ProblemsButton } from './ProblemsButton'
import { NewInstanceButton } from '@/components/instance/NewInstanceButton'
import { useEditorMode } from '@/hooks/useEditorMode'

export function EditActions() {
  const { undo, redo, undoLabel, redoLabel } = useModels()
  const { save, unsaved } = useSaveFiles()
  const { mode } = useEditorMode()

  return (
    <>
      <FileMenu />
      {mode === 'edit' && <NewModelButton />}
      {mode === 'instance' && <NewInstanceButton />}
      <Separator orientation="vertical" className="mx-1 hidden h-5 md:block" />
      <IconAction
        label={undoLabel ? `Undo ${undoLabel}` : 'Undo'}
        hint={modKey('Z')}
        disabled={!undoLabel}
        onClick={undo}
      >
        <Undo2Icon />
      </IconAction>
      <IconAction
        label={redoLabel ? `Redo ${redoLabel}` : 'Redo'}
        hint={modKey('Z', true)}
        disabled={!redoLabel}
        onClick={redo}
      >
        <Redo2Icon />
      </IconAction>
      <ConstraintsButton />
      <ProblemsButton />
      <Separator orientation="vertical" className="mx-1 hidden h-5 md:block" />
      <Button
        variant={unsaved ? 'default' : 'outline'}
        onClick={() => void save()}
        title={`Download the changed files (${modKey('S')})`}
      >
        <SaveIcon />
        Save
        {unsaved > 0 && <span className="font-mono text-xs opacity-80">{unsaved}</span>}
      </Button>
    </>
  )
}
