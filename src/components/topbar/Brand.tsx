export function Brand() {
  return (
    <div className="flex flex-none items-center gap-2">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className="stroke-primary">
        <rect x="2" y="3" width="9" height="7" rx="1.5" fill="none" strokeWidth="1.6" />
        <rect x="13" y="14" width="9" height="7" rx="1.5" fill="none" strokeWidth="1.6" />
        <rect x="13" y="3" width="9" height="7" rx="1.5" fill="none" strokeWidth="1.6" opacity=".5" />
        <path d="M6.5 10v7.5H13" fill="none" strokeWidth="1.6" />
      </svg>
      <h1 className="text-[15px] font-semibold tracking-[.01em]">Ecore viewer</h1>
    </div>
  )
}
