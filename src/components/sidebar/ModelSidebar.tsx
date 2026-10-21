import { useCallback, useRef, useState } from 'react'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar'
import { useDiagram } from '@/hooks/useDiagram'
import { useResizableSize } from '@/hooks/useResizableSize'
import { useSelectNode } from '@/hooks/useSelectNode'
import { LayoutPanel } from './LayoutPanel'
import { Legend } from './Legend'
import { ModelTree } from './ModelTree'
import { SearchBox } from './SearchBox'
import { SettingsResizeHandle } from './SettingsResizeHandle'
import { ViewOptionsPanel } from './ViewOptionsPanel'

const SETTINGS_HEIGHT = 300
const SETTINGS_MIN = 60
const SETTINGS_MAX = 1200

export function ModelSidebar() {
  const [query, setQuery] = useState('')
  const { graph } = useDiagram()
  const selectNode = useSelectNode()
  const settingsRef = useRef<HTMLDivElement>(null)
  const measureSettings = useCallback(() => settingsRef.current?.getBoundingClientRect().height, [])
  const { size: settingsHeight, startResize } = useResizableSize(
    'ecore-viewer:settings-height',
    SETTINGS_HEIGHT,
    SETTINGS_MIN,
    SETTINGS_MAX,
    'bottom',
    measureSettings,
  )

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
        {/* The settings scroll in a pane the user sizes; it shrinks when collapsed and always leaves the tree some room. */}
        <div
          ref={settingsRef}
          className="overflow-y-auto"
          style={{ maxHeight: `min(${settingsHeight}px, calc(100svh - 16rem))` }}
        >
          <ViewOptionsPanel />
          <LayoutPanel />
        </div>
      </SidebarHeader>
      <SettingsResizeHandle onPointerDown={startResize} />
      <SidebarContent className="overflow-hidden">
        <ModelTree query={query} />
      </SidebarContent>
      <SidebarFooter className="p-0">
        <Legend />
      </SidebarFooter>
    </Sidebar>
  )
}
