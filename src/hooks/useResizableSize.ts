import { useCallback, useState, type PointerEvent } from 'react'

function readStored(key: string, fallback: number): number {
  try {
    const value = Number(localStorage.getItem(key))
    return Number.isFinite(value) && value > 0 ? value : fallback
  } catch {
    return fallback
  }
}

/** The side of the panel its handle is on; dragging the handle away from the panel grows it. */
export type ResizeEdge = 'left' | 'right' | 'top' | 'bottom'

/**
 * A width or height the user can drag, kept between `min` and `max` and remembered. `startResize` goes on
 * the handle's pointerdown. `measure` reads the panel's real size when a drag starts, for panels drawn
 * smaller than the stored size.
 */
export function useResizableSize(
  storageKey: string,
  initial: number,
  min: number,
  max: number,
  edge: ResizeEdge,
  measure?: () => number | undefined,
) {
  const clamp = useCallback((n: number) => Math.min(max, Math.max(min, n)), [min, max])
  const [size, setSize] = useState(() => clamp(readStored(storageKey, initial)))

  const startResize = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      event.preventDefault()
      const target = event.currentTarget
      target.setPointerCapture(event.pointerId)
      const vertical = edge === 'top' || edge === 'bottom'
      const start = vertical ? event.clientY : event.clientX
      const startSize = clamp(measure?.() ?? size)
      let latest = startSize
      const onMove = (e: globalThis.PointerEvent) => {
        const at = vertical ? e.clientY : e.clientX
        const delta = edge === 'left' || edge === 'top' ? start - at : at - start
        latest = clamp(startSize + delta)
        setSize(latest)
      }
      const onUp = () => {
        target.removeEventListener('pointermove', onMove)
        target.removeEventListener('pointerup', onUp)
        try {
          localStorage.setItem(storageKey, String(latest))
        } catch {
          // The size is cosmetic; losing it is fine.
        }
      }
      target.addEventListener('pointermove', onMove)
      target.addEventListener('pointerup', onUp)
    },
    [size, edge, clamp, storageKey, measure],
  )

  return { size, startResize }
}
