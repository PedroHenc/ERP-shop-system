import { RiFilter3Line } from '@remixicon/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useIsCompact } from '@/hooks/use-compact'

interface FiltersButtonProps {
  activeCount: number
  onClear: () => void
  children: ReactNode
}

export function FiltersButton({ activeCount, onClear, children }: FiltersButtonProps) {
  const { t } = useTranslation()
  const compact = useIsCompact()
  const name = activeCount > 0 ? t('filters.buttonWithCount', { count: activeCount }) : t('filters.button')

  const trigger = (
    <Button variant="outline" size="sm" aria-label={name}>
      <RiFilter3Line data-icon="inline-start" />
      {t('filters.button')}
      {activeCount > 0 ? (
        <Badge aria-hidden="true" className="tabular-nums">
          {activeCount}
        </Badge>
      ) : null}
    </Button>
  )
  const clear = (
    <Button variant="ghost" size="sm" onClick={onClear}>
      {t('filters.clear')}
    </Button>
  )

  if (compact) {
    return (
      <Sheet>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>{t('filters.title')}</SheetTitle>
            <SheetDescription className="sr-only">{t('filters.title')}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-4">{children}</div>
          <SheetFooter className="flex-row justify-end">{clear}</SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-3 p-3">
        <div className="flex flex-col gap-3">{children}</div>
        <div className="flex justify-end border-t pt-2">{clear}</div>
      </PopoverContent>
    </Popover>
  )
}
