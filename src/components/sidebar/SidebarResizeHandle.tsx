import type { PointerEvent } from 'react'

interface SidebarResizeHandleProps {
  width: number
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
}

/** A draggable strip on the sidebar's right edge. The sidebar is a sheet on small screens, so it hides there. */
export function SidebarResizeHandle({ width, onPointerDown }: SidebarResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      onPointerDown={onPointerDown}
      style={{ left: width - 4 }}
      className="absolute inset-y-0 z-20 hidden w-2 cursor-col-resize touch-none transition-colors hover:bg-primary/30 active:bg-primary/40 md:block"
    />
  )
}
