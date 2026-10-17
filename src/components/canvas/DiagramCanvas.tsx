import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import { useDiagram } from '@/hooks/useDiagram'
import { useLoadFiles } from '@/hooks/useLoadFiles'
import { useSelection } from '@/hooks/useSelection'
import { useTheme } from '@/hooks/useTheme'
import { neighbourhood } from '@/lib/ecore/visibleGraph'
import { cn } from '@/lib/utils'
import { afterPaint } from './afterPaint'
import { DropOverlay } from './DropOverlay'
import { EdgeMarkers } from './edges/EdgeMarkers'
import { edgeTypes, type DiagramEdge } from './edges/edgeTypes'
import { EmptyState } from './EmptyState'
import { FIT_OPTIONS, MAX_ZOOM, MIN_ZOOM } from './fitOptions'
import { nodeTypes, type DiagramNode } from './nodes/nodeTypes'
import { ZoomPanel } from './ZoomPanel'

const FADE = 'transition-opacity duration-150 motion-reduce:transition-none'
const DIMMED = `${FADE} opacity-[.16]`
const CENTRE_MIN_ZOOM = 0.5
const CENTRE_ZOOM = 0.7

export function DiagramCanvas() {
  const { theme } = useTheme()
  const { graph, visible, layout, nodes: layoutNodesList, edges, toggleCollapsed } = useDiagram()
  const { selectedId, centerRequest, select, clear } = useSelection()
  const { loadFiles } = useLoadFiles()
  const { fitView, setCenter, getNode, getZoom } = useReactFlow<DiagramNode, DiagramEdge>()
  const [nodes, setNodes, onNodesChange] = useNodesState<DiagramNode>([])
  const [dropping, setDropping] = useState(false)
  const appliedLayout = useRef<object | null>(null)

  // A new layout replaces dragged positions and fits the view; a collapse keeps them.
  useEffect(() => {
    if (appliedLayout.current !== layout) {
      appliedLayout.current = layout
      setNodes(layoutNodesList)
      if (layout && layoutNodesList.length) return afterPaint(() => void fitView(FIT_OPTIONS))
      return
    }
    setNodes((prev) => {
      const positions = new Map(prev.map((n) => [n.id, n.position]))
      return layoutNodesList.map((n) => ({ ...n, position: positions.get(n.id) ?? n.position }))
    })
  }, [layout, layoutNodesList, setNodes, fitView])

  useEffect(() => {
    if (!centerRequest) return
    return afterPaint(() => {
      const target = getNode(centerRequest.id)
      if (!target) return
      const width = target.measured?.width ?? target.width ?? 0
      const height = target.measured?.height ?? target.height ?? 0
      const zoom = getZoom()
      void setCenter(target.position.x + width / 2, target.position.y + height / 2, {
        zoom: zoom < CENTRE_MIN_ZOOM ? CENTRE_ZOOM : zoom,
        duration: 0,
      })
    })
  }, [centerRequest, getNode, getZoom, setCenter])

  useEffect(() => {
    const ignore = (event: Event) => event.preventDefault()
    window.addEventListener('dragover', ignore)
    window.addEventListener('drop', ignore)
    return () => {
      window.removeEventListener('dragover', ignore)
      window.removeEventListener('drop', ignore)
    }
  }, [])

  const focus = useMemo(
    () => (graph && visible && selectedId && visible.nodeIds.has(selectedId) ? neighbourhood(visible.edges, selectedId) : null),
    [graph, visible, selectedId],
  )

  const displayNodes = useMemo<DiagramNode[]>(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selectedId,
        className: focus && !focus.nodeIds.has(n.id) ? DIMMED : FADE,
      })),
    [nodes, selectedId, focus],
  )

  const displayEdges = useMemo<DiagramEdge[]>(
    () => edges.map((e) => ({ ...e, className: focus && !focus.edgeIds.has(e.id) ? DIMMED : FADE })),
    [edges, focus],
  )

  const onDragOver = (event: DragEvent) => {
    event.preventDefault()
    setDropping(true)
  }
  const onDragLeave = (event: DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropping(false)
  }
  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDropping(false)
    const files = Array.from(event.dataTransfer.files)
    if (files.length) void loadFiles(files)
  }

  return (
    <section
      aria-label="Diagram"
      className={cn('relative min-w-0 flex-1')}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <EdgeMarkers />
      <ReactFlow<DiagramNode, DiagramEdge>
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_, node) => select(node.id)}
        onNodeDoubleClick={(_, node) => {
          if (node.data.node.kind !== 'external') toggleCollapsed(node.id)
        }}
        onPaneClick={clear}
        colorMode={theme}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        nodesConnectable={false}
        elementsSelectable={false}
        nodeDragThreshold={4}
        nodeClickDistance={4}
        paneClickDistance={4}
        zoomOnDoubleClick={false}
        attributionPosition="bottom-left"
        className="!bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--grid)" />
        <ZoomPanel />
      </ReactFlow>
      {!graph && <EmptyState />}
      {dropping && <DropOverlay />}
    </section>
  )
}
