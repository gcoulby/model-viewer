import type { PointerEvent } from 'react'

/** A thin draggable strip on the left edge of the details panel. */
export function PanelResizeHandle({ onPointerDown }: { onPointerDown: (event: PointerEvent<HTMLElement>) => void }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize details panel"
      onPointerDown={onPointerDown}
      className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize touch-none transition-colors hover:bg-primary/30 active:bg-primary/40"
    />
  )
}
