import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  Background,
  type NodeChange,
  BackgroundVariant,
  ReactFlow,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import { useDiagram } from '@/hooks/useDiagram'
import { useLoadFiles } from '@/hooks/useLoadFiles'
import { useSelection } from '@/hooks/useSelection'
import { useTheme } from '@/hooks/useTheme'
import { useViewOptions } from '@/hooks/useViewOptions'
import type { Box } from '@/lib/ecore/edgeGeometry'
import { computeGroupBoxes, groupKeyOf } from '@/lib/ecore/groups'
import { routeEdges } from '@/lib/ecore/routing'
import { neighbourhood } from '@/lib/ecore/visibleGraph'
import { cn } from '@/lib/utils'
import { afterPaint } from './afterPaint'
import { DropOverlay } from './DropOverlay'
import { EdgeMarkers } from './edges/EdgeMarkers'
import { edgeTypes, type DiagramEdge } from './edges/edgeTypes'
import { EmptyState } from './EmptyState'
import { FIT_OPTIONS, MAX_ZOOM, MIN_ZOOM } from './fitOptions'
import { nodeTypes, type CanvasNode, type DiagramNode } from './nodes/nodeTypes'
import { ScopeBanner } from './ScopeBanner'
import { ZoomPanel, type CanvasTool } from './ZoomPanel'

const FADE = 'transition-opacity duration-150 motion-reduce:transition-none'
const DIMMED = `${FADE} opacity-[.16]`
const GROUP_PREFIX = 'group|'
const CENTRE_MIN_ZOOM = 0.5
const CENTRE_ZOOM = 0.7

export function DiagramCanvas() {
  const { theme } = useTheme()
  const { graph, visible, layout, nodes: layoutNodesList, edges, shapingEdgeIds, toggleCollapsed } = useDiagram()
  const { options, display } = useViewOptions()
  const { selectedId, centerRequest, select, clear } = useSelection()
  const { loadDropped } = useLoadFiles()
  const { fitView, setCenter, getNode, getZoom } = useReactFlow<CanvasNode, DiagramEdge>()
  const [nodes, setNodes, onNodesChange] = useNodesState<DiagramNode>([])
  const [dropping, setDropping] = useState(false)
  const [tool, setTool] = useState<CanvasTool>('pan')
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
      const selected = new Set(prev.filter((n) => n.selected).map((n) => n.id))
      return layoutNodesList.map((n) => ({
        ...n,
        position: positions.get(n.id) ?? n.position,
        selected: selected.has(n.id),
      }))
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

  // The sidebar and the detail panel's links select without a click on the canvas, so mirror that here.
  useEffect(() => {
    setNodes((prev) =>
      prev.some((n) => !!n.selected !== (n.id === selectedId))
        ? prev.map((n) => ({ ...n, selected: n.id === selectedId }))
        : prev,
    )
  }, [selectedId, setNodes])

  const focus = useMemo(
    () => (graph && visible && selectedId && visible.nodeIds.has(selectedId) ? neighbourhood(visible.edges, selectedId) : null),
    [graph, visible, selectedId],
  )

  const displayNodes = useMemo<CanvasNode[]>(() => {
    const groups = computeGroupBoxes(
      nodes.map((n) => ({
        node: n.data.node,
        x: n.position.x,
        y: n.position.y,
        width: n.width ?? n.data.geometry.width,
        height: n.height ?? n.data.geometry.height,
      })),
      options.grouping,
    ).map<CanvasNode>((g) => ({
      id: `${GROUP_PREFIX}${g.key}`,
      type: 'fileGroup',
      position: { x: g.x, y: g.y },
      width: g.width,
      height: g.height,
      zIndex: -1,
      draggable: true,
      selectable: false,
      focusable: false,
      // Only the label strip takes the pointer, so the empty inside of a box still pans and box-selects.
      style: { pointerEvents: 'none' },
      data: { groupKey: g.key, hueKey: g.hueKey, label: g.label },
    }))
    const typed = nodes.map<CanvasNode>((n) => ({
      ...n,
      className: focus && !focus.nodeIds.has(n.id) ? DIMMED : FADE,
    }))
    return [...groups, ...typed]
  }, [nodes, focus, options.grouping])

  // Paths follow the boxes as they are now, so they are rerouted while a box is dragged.
  const displayEdges = useMemo<DiagramEdge[]>(() => {
    const boxes = new Map<string, Box>(
      nodes.map((n) => [
        n.id,
        {
          x: n.position.x,
          y: n.position.y,
          width: n.width ?? n.data.geometry.width,
          height: n.height ?? n.data.geometry.height,
        },
      ]),
    )
    const drawn = edges.filter(
      (e) => display.otherLinks === 'show' || shapingEdgeIds.has(e.id) || !!focus?.edgeIds.has(e.id),
    )
    const paths = routeEdges(
      boxes,
      drawn.flatMap((e) => (e.data ? [{ edge: e.data.edge, parallel: e.data.parallel }] : [])),
      display.routing,
      options.direction,
      layout?.laidOut,
    )
    return drawn.flatMap((e) =>
      e.data
        ? [
            {
              ...e,
              data: { ...e.data, path: paths.get(e.id) ?? null, labels: display.labels },
              className: focus && !focus.edgeIds.has(e.id) ? DIMMED : FADE,
            },
          ]
        : [],
    )
  }, [nodes, edges, focus, display, shapingEdgeIds, options.direction, layout])

  // The file boxes are derived from their nodes, so dragging one moves the nodes inside it. Other
  // changes to a box (size, selection) mean nothing to the state and are dropped.
  const handleNodesChange = (changes: NodeChange<CanvasNode>[]) => {
    const own: NodeChange<DiagramNode>[] = []
    for (const change of changes) {
      const isGroup = 'id' in change && change.id.startsWith(GROUP_PREFIX)
      if (!isGroup) {
        own.push(change as NodeChange<DiagramNode>)
        continue
      }
      if (change.type !== 'position') continue
      const box = getNode(change.id)
      const key = change.id.slice(GROUP_PREFIX.length)
      const members = nodes.filter((n) => groupKeyOf(n.data.node, options.grouping) === key)
      const dx = change.position && box ? change.position.x - box.position.x : 0
      const dy = change.position && box ? change.position.y - box.position.y : 0
      for (const m of members) {
        own.push({
          type: 'position',
          id: m.id,
          dragging: change.dragging,
          ...(change.position ? { position: { x: m.position.x + dx, y: m.position.y + dy } } : {}),
        })
      }
    }
    onNodesChange(own)
  }

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
    void loadDropped(event.dataTransfer)
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
      <ReactFlow<CanvasNode, DiagramEdge>
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onNodeClick={(event, node) => {
          // A modifier click is adding to the selection, which the detail panel cannot show.
          if (node.type !== 'fileGroup' && !event.metaKey && !event.ctrlKey && !event.shiftKey) select(node.id)
        }}
        onSelectionStart={clear}
        elementsSelectable
        selectionOnDrag={tool === 'select'}
        panOnDrag={tool === 'select' ? [1, 2] : true}
        onNodeDoubleClick={(_, node) => {
          if (node.type !== 'fileGroup' && node.data.node.kind !== 'external') toggleCollapsed(node.id)
        }}
        onPaneClick={clear}
        colorMode={theme}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        nodesConnectable={false}
        nodeDragThreshold={4}
        nodeClickDistance={4}
        paneClickDistance={4}
        zoomOnDoubleClick={false}
        attributionPosition="bottom-left"
        className="!bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--grid)" />
        <ZoomPanel tool={tool} onToolChange={setTool} />
        <ScopeBanner />
      </ReactFlow>
      {!graph && <EmptyState dropping={dropping} />}
      {dropping && graph && <DropOverlay />}
    </section>
  )
}
