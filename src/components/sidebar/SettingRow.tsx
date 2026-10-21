import type { ReactNode } from 'react'

/** A small caption over one layout control. */
export function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-2">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  )
}
