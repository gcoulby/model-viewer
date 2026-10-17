import type { LegendId } from '@/data/legend'

const STROKE = { strokeWidth: 1.4, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function LegendGlyph({ id }: { id: LegendId }) {
  return (
    <svg width="42" height="12" viewBox="0 0 42 12" aria-hidden="true" className="block text-edge" stroke="currentColor">
      {id === 'inherit' && (
        <>
          <path d="M0 6H30" strokeWidth="1.4" fill="none" />
          <path d="M30 1.5L41 6L30 10.5z" className="fill-node" strokeWidth="1.3" strokeLinejoin="round" />
        </>
      )}
      {id === 'containment' && (
        <>
          <path d="M0 6L7 1.5L14 6L7 10.5z" fill="currentColor" stroke="none" />
          <path d="M14 6H40M33 1.5L40 6L33 10.5" {...STROKE} />
        </>
      )}
      {id === 'reference' && <path d="M0 6H40M33 1.5L40 6L33 10.5" {...STROKE} />}
      {id === 'opposite' && <path d="M0 6H42" strokeWidth="1.4" fill="none" />}
      {id === 'enumLink' && (
        <path d="M0 6H40M33 1.5L40 6L33 10.5" {...STROKE} strokeWidth={1} strokeDasharray="4 4" />
      )}
    </svg>
  )
}
