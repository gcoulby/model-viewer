export function FeatureList({ rows }: { rows: string[] }) {
  return (
    <ul>
      {rows.map((row, i) => (
        <li key={i} className="border-b py-[3px] font-mono text-xs leading-normal break-words last:border-b-0">
          {row}
        </li>
      ))}
    </ul>
  )
}
