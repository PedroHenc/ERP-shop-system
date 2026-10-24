import { RiSearchLine } from '@remixicon/react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  label: string
}

export function SearchInput({ value, onChange, label }: SearchInputProps) {
  return (
    <InputGroup className="w-full sm:w-64">
      <InputGroupAddon>
        <RiSearchLine aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        aria-label={label}
      />
    </InputGroup>
  )
}
