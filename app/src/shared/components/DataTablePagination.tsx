import {
  RiArrowLeftDoubleLine,
  RiArrowLeftSLine,
  RiArrowRightDoubleLine,
  RiArrowRightSLine,
} from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface DataTablePaginationProps {
  /** 0-based current page. */
  page: number
  size: number
  sizes: readonly number[]
  totalElements: number
  totalPages: number
  onPageChange: (page: number) => void
  onSizeChange: (size: number) => void
}

export function DataTablePagination({
  page,
  size,
  sizes,
  totalElements,
  totalPages,
  onPageChange,
  onSizeChange,
}: DataTablePaginationProps) {
  const { t } = useTranslation()
  const lastPage = Math.max(totalPages - 1, 0)
  const atFirst = page <= 0
  const atLast = page >= lastPage
  const from = totalElements === 0 ? 0 : page * size + 1
  const to = Math.min((page + 1) * size, totalElements)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="text-muted-foreground tabular-nums">
        {t('pagination.showing', { from, to, total: totalElements })}
      </span>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t('pagination.rowsPerPage')}</span>
          <Select value={String(size)} onValueChange={(value) => onSizeChange(Number(value))}>
            <SelectTrigger size="sm" aria-label={t('pagination.rowsPerPage')} className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sizes.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="tabular-nums">{t('pagination.pageOf', { page: page + 1, total: Math.max(totalPages, 1) })}</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" aria-label={t('pagination.first')} disabled={atFirst} onClick={() => onPageChange(0)}>
            <RiArrowLeftDoubleLine />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label={t('pagination.previous')} disabled={atFirst} onClick={() => onPageChange(page - 1)}>
            <RiArrowLeftSLine />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label={t('pagination.next')} disabled={atLast} onClick={() => onPageChange(page + 1)}>
            <RiArrowRightSLine />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label={t('pagination.last')} disabled={atLast} onClick={() => onPageChange(lastPage)}>
            <RiArrowRightDoubleLine />
          </Button>
        </div>
      </div>
    </div>
  )
}
