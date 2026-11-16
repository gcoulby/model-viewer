import { createContext } from 'react'
import type { Metamodel } from '@/lib/instance/metamodel'
import type { InstanceFile } from '@/lib/instance/objectGraph'

export interface InstancesContextValue {
  /** Every open metamodel's classes, as instances need them. Null outside Instance mode. */
  meta: Metamodel | null
  /** The open files that are instances rather than metamodels. */
  instanceFiles: InstanceFile[]
  /** Keys of the instance files, so metamodel views can leave them out. */
  instanceKeys: ReadonlySet<string>
}

export const InstancesContext = createContext<InstancesContextValue | null>(null)
