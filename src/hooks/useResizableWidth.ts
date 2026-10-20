import { useCallback, useState, type PointerEvent } from 'react'

function readStored(key: string, fallback: number): number {
  try {
    const value = Number(localStorage.getItem(key))
    return Number.isFinite(value) && value > 0 ? value : fallback
  } catch {
    return fallback
  }
}

/**
 * A width the user can drag, kept between `min` and `max` and remembered. `startResize` goes on the
 * handle's pointerdown; `edge` says which side of the panel the handle is on.
 */
export function useResizableWidth(storageKey: string, initial: number, min: number, max: number, edge: 'left' | 'right') {
  const clamp = useCallback((n: number) => Math.min(max, Math.max(min, n)), [min, max])
  const [width, setWidth] = useState(() => clamp(readStored(storageKey, initial)))

  const startResize = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      event.preventDefault()
      const target = event.currentTarget
      target.setPointerCapture(event.pointerId)
      const startX = event.clientX
      const startWidth = width
      let latest = width
      const onMove = (e: globalThis.PointerEvent) => {
        const delta = edge === 'left' ? startX - e.clientX : e.clientX - startX
        latest = clamp(startWidth + delta)
        setWidth(latest)
      }
      const onUp = () => {
        target.removeEventListener('pointermove', onMove)
        target.removeEventListener('pointerup', onUp)
        try {
          localStorage.setItem(storageKey, String(latest))
        } catch {
          // The width is cosmetic; losing it is fine.
        }
      }
      target.addEventListener('pointermove', onMove)
      target.addEventListener('pointerup', onUp)
    },
    [width, edge, clamp, storageKey],
  )

  return { width, startResize }
}
