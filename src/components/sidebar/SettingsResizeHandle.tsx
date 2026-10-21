import type { PointerEvent } from 'react'

/** A draggable strip between the sidebar's settings and the model tree. */
export function SettingsResizeHandle({ onPointerDown }: { onPointerDown: (event: PointerEvent<HTMLElement>) => void }) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize settings"
      title="Drag to give the settings or the files more room"
      onPointerDown={onPointerDown}
      className="relative z-10 -my-1 h-2 shrink-0 cursor-row-resize touch-none transition-colors hover:bg-primary/30 active:bg-primary/40"
    />
  )
}
