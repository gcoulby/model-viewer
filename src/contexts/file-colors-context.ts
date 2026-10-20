import { createContext } from 'react'
import type { HueFor } from '@/lib/ecore/paint'

export interface FileColorsContextValue {
  hueFor: HueFor
  setHue: (fileKey: string, hue: number) => void
  resetHue: (fileKey: string) => void
  isCustom: (fileKey: string) => boolean
}

export const FileColorsContext = createContext<FileColorsContextValue | null>(null)
