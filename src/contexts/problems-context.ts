import { createContext } from 'react'
import type { Problem } from '@/lib/ecore/edit/validate'

export interface ProblemsContextValue {
  /** Every problem in the open files, errors first. Empty outside edit mode. */
  problems: Problem[]
  /** Problems by the `refId` of the element they are on. */
  byRef: ReadonlyMap<string, Problem[]>
  /** `refId`s of elements with a problem somewhere inside them, so a closed tree row can say so. */
  within: ReadonlySet<string>
  errors: number
  warnings: number
}

export const ProblemsContext = createContext<ProblemsContextValue | null>(null)
