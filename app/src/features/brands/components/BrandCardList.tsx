import { Skeleton } from '@/components/ui/skeleton'
import { useCan } from '@/app/auth/permissions'
import type { BrandDetail } from '@/features/brands/types'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { type BrandActions, BrandNameButton, BrandRowActions } from './BrandTable'

interface BrandCardListProps extends BrandActions {
  brands: BrandDetail[]
  /** True on the first load, before any data exists. */
  loading: boolean
}

const SKELETON_CARDS = 6

/** Compact (phone) rendering of the brand list: one card per brand, tappable with write access. */
export function BrandCardList({ brands, loading, onEdit, onDeactivate, onActivate }: BrandCardListProps) {
  const canWrite = useCan('brands.write')

  if (loading) {
    return (
      <div className="flex flex-col divide-y" aria-hidden="true">
        {Array.from({ length: SKELETON_CARDS }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <ul className="flex flex-col divide-y">
      {brands.map((brand) => (
        <li
          key={brand.id}
          className={`flex items-center justify-between gap-2 p-4 transition-colors hover:bg-muted/40${canWrite ? ' cursor-pointer' : ''}`}
          onClick={canWrite ? () => onEdit(brand) : undefined}
        >
          <div className="flex min-w-0 flex-col gap-1">
            <BrandNameButton brand={brand} onEdit={onEdit} />
            <div>
              <StatusBadge active={brand.active} />
            </div>
          </div>
          <BrandRowActions brand={brand} onEdit={onEdit} onDeactivate={onDeactivate} onActivate={onActivate} />
        </li>
      ))}
    </ul>
  )
}
