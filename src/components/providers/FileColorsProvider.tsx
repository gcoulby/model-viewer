import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { FileColorsContext } from '@/contexts/file-colors-context'
import { defaultFileHue } from '@/lib/ecore/paint'

const STORAGE_KEY = 'ecore-viewer:file-hues'

function readStored(): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (!parsed || typeof parsed !== 'object') return {}
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === 'number'))
  } catch {
    return {}
  }
}

function writeStored(hues: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hues))
  } catch {
    // Colours are cosmetic; losing them is fine.
  }
}

export function FileColorsProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, number>>(readStored)

  const update = useCallback((change: (prev: Record<string, number>) => Record<string, number>) => {
    setOverrides((prev) => {
      const next = change(prev)
      writeStored(next)
      return next
    })
  }, [])

  const setHue = useCallback((key: string, hue: number) => update((prev) => ({ ...prev, [key]: hue })), [update])
  const resetHue = useCallback(
    (key: string) =>
      update((prev) => {
        const { [key]: _removed, ...rest } = prev
        return rest
      }),
    [update],
  )

  const value = useMemo(
    () => ({
      hueFor: (key: string) => overrides[key] ?? defaultFileHue(key),
      isCustom: (key: string) => key in overrides,
      setHue,
      resetHue,
    }),
    [overrides, setHue, resetHue],
  )
  return <FileColorsContext.Provider value={value}>{children}</FileColorsContext.Provider>
}
