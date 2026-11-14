import type { TypeCandidate } from '@/lib/ecore/edit/candidates'
import type { PickerOption } from './TypePicker'

/** Turns type candidates into picker options, grouped as this file, each other file, then Ecore. */
export function candidateOptions(candidates: TypeCandidate[], fromKey: string, fileName: (key: string) => string): PickerOption[] {
  const rank = (c: TypeCandidate) => (c.fileKey === fromKey ? 0 : c.fileKey ? 1 : 2)
  return [...candidates]
    .sort((a, b) => rank(a) - rank(b) || (a.fileKey ?? '').localeCompare(b.fileKey ?? ''))
    .map((c) => ({
      id: c.choice.kind === 'builtin' ? `ecore|${c.name}` : `${c.choice.fileKey}#${c.choice.fragment}`,
      name: c.name,
      where: c.where,
      group: c.fileKey === fromKey ? 'This file' : c.fileKey ? fileName(c.fileKey) : 'Ecore',
      candidate: c,
      badge: c.eKind,
    }))
}
