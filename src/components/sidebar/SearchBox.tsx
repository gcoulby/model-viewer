import { Input } from '@/components/ui/input'

interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}

export function SearchBox({ value, onChange, onSubmit }: SearchBoxProps) {
  return (
    <Input
      type="search"
      value={value}
      placeholder="Find a class, enum or package"
      aria-label="Find a class, enum or package"
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onSubmit()
      }}
    />
  )
}
