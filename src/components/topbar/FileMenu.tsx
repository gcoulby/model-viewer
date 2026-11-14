import { ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SAMPLES } from '@/data/samples'
import { useDiagram } from '@/hooks/useDiagram'
import { useDiagramExport } from '@/hooks/useDiagramExport'
import { useFilePickers } from '@/hooks/useFilePickers'
import { useLoadFiles } from '@/hooks/useLoadFiles'
import { useModels } from '@/hooks/useModels'
import { usePasteDialog } from '@/hooks/usePasteDialog'
import { useSaveFiles } from '@/hooks/useSaveFiles'

/** Edit mode keeps view mode's open and export buttons in one menu, to make room for editing. */
export function FileMenu() {
  const { openFiles, openFolder, inputs } = useFilePickers()
  const { setOpen: setPasteOpen } = usePasteDialog()
  const { loadSample } = useLoadFiles()
  const { createModel, files } = useModels()
  const { graph } = useDiagram()
  const exportDiagram = useDiagramExport()
  const { downloadAll } = useSaveFiles()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          File
          <ChevronDownIcon className="text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem onClick={() => createModel()}>New model</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openFiles}>Open files…</DropdownMenuItem>
          <DropdownMenuItem onClick={openFolder}>Open folder…</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPasteOpen(true)}>Paste XML…</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Samples</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-72">
              {SAMPLES.map((sample) => (
                <DropdownMenuItem
                  key={sample.id}
                  onClick={() => loadSample(sample)}
                  className="flex-col items-start gap-0"
                >
                  <span className="font-medium">{sample.label}</span>
                  <span className="text-xs text-muted-foreground">{sample.description}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!files.length} onClick={() => void downloadAll()}>
            Download all files
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!graph} onClick={() => void exportDiagram('svg')}>
            Export SVG
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!graph} onClick={() => void exportDiagram('png')}>
            Export PNG
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {inputs}
    </>
  )
}
