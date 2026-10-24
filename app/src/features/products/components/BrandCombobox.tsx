import { RiArrowDownSLine, RiCheckLine } from '@remixicon/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useBrands } from '@/features/brands/queries'
import { cn } from '@/lib/utils'

export interface BrandComboboxProps {
  value: number | null
  onChange: (id: number | null) => void
  /** Show a leading option that clears the selection. */
  allowNone?: boolean
  /** Label of the clear option (and of the trigger when nothing is selected). Defaults to "No brand". */
  noneLabel?: string
  id?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
}

export function BrandCombobox({
  value,
  onChange,
  allowNone = false,
  noneLabel,
  id,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
}: BrandComboboxProps) {
  const { t } = useTranslation('products')
  const [open, setOpen] = useState(false)
  const { data: brands = [] } = useBrands()
  const none = noneLabel ?? t('brand.none')
  const selected = brands.find((b) => b.id === value)
  const triggerLabel = selected ? selected.name : value === null && allowNone ? none : t('brand.select')

  function select(id: number | null) {
    onChange(id)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>{triggerLabel}</span>
          <RiArrowDownSLine className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={t('brand.search')} />
          <CommandList>
            <CommandEmpty>{t('brand.empty')}</CommandEmpty>
            <CommandGroup>
              {allowNone ? (
                <CommandItem value={`__none__ ${none}`} onSelect={() => select(null)}>
                  {none}
                  {value === null ? <RiCheckLine className="ml-auto" /> : null}
                </CommandItem>
              ) : null}
              {brands.map((brand) => (
                <CommandItem key={brand.id} value={`${brand.id} ${brand.name}`} onSelect={() => select(brand.id)}>
                  {brand.name}
                  {brand.id === value ? <RiCheckLine className="ml-auto" /> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
