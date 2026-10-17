import type { ReactNode } from 'react'

interface DetailSectionProps {
  title: string
  count?: number
  children: ReactNode
}

export function DetailSection({ title, count, children }: DetailSectionProps) {
  return (
    <section>
      <h3 className="mt-[18px] mb-1.5 text-[13px] font-semibold">
        {title}
        {count != null && <small className="ml-1 font-normal text-muted-foreground">{count}</small>}
      </h3>
      {children}
    </section>
  )
}
