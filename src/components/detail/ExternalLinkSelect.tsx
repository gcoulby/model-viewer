import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useModels } from '@/hooks/useModels'

const NONE = ''

/** Lets the user say which loaded file defines an external type, joining its references up. */
export function ExternalLinkSelect({ source }: { source: string }) {
  const { models, linkExternal } = useModels()
  const items = models.map((m) => ({ value: m.key, label: m.fileName }))
  return (
    <div className="mt-2">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">Defined in:</label>
      <Select
        value={NONE}
        items={items}
        disabled={!models.length}
        onValueChange={(value) => value && linkExternal(source, value)}
      >
        <SelectTrigger size="sm" className="w-full font-mono text-xs" aria-label="Defined in">
          <SelectValue placeholder="Choose a loaded file" />
        </SelectTrigger>
        <SelectContent>
          {models.map((m) => (
            <SelectItem key={m.key} value={m.key} className="font-mono text-xs">
              {m.fileName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
