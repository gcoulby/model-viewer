import { useState } from 'react'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar'
import { useDiagram } from '@/hooks/useDiagram'
import { useSelectNode } from '@/hooks/useSelectNode'
import { Legend } from './Legend'
import { ModelTree } from './ModelTree'
import { SearchBox } from './SearchBox'
import { ViewOptionsPanel } from './ViewOptionsPanel'

export function ModelSidebar() {
  const [query, setQuery] = useState('')
  const { graph } = useDiagram()
  const selectNode = useSelectNode()

  const selectFirstMatch = () => {
    const needle = query.trim().toLowerCase()
    if (!needle || !graph) return
    const hit = [...graph.nodes.values()].find(
      (n) => n.kind !== 'external' && n.name.toLowerCase().includes(needle),
    )
    if (hit) selectNode(hit.id, { center: true })
  }

  return (
    <Sidebar className="top-12 h-[calc(100svh-3rem)]">
      <SidebarHeader className="gap-0 p-0">
        <div className="px-3 pt-2.5 pb-2">
          <SearchBox value={query} onChange={setQuery} onSubmit={selectFirstMatch} />
        </div>
        <ViewOptionsPanel />
      </SidebarHeader>
      <SidebarContent className="overflow-hidden">
        <ModelTree query={query} />
      </SidebarContent>
      <SidebarFooter className="p-0">
        <Legend />
      </SidebarFooter>
    </Sidebar>
  )
}
