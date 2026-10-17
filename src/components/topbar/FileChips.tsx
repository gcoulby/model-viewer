import { useModels } from '@/hooks/useModels'
import { FileChip } from './FileChip'

export function FileChips() {
  const { models, removeModel } = useModels()
  return (
    <div className="hidden min-w-0 gap-1.5 overflow-hidden md:flex">
      {models.map((model) => (
        <FileChip key={model.key} model={model} onRemove={removeModel} />
      ))}
    </div>
  )
}
