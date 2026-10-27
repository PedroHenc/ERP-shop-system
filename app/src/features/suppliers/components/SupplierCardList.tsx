import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router'
import { useCan } from '@/app/auth/permissions'
import { Skeleton } from '@/components/ui/skeleton'
import type { Supplier } from '@/features/suppliers/types'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useRowMotion } from '@/shared/list/useRowMotion'
import { type SupplierActions, SupplierRowActions } from './SupplierTable'
import { placeholderKeys } from '@/shared/list/placeholder-keys'

interface SupplierCardListProps extends SupplierActions {
  suppliers: Supplier[]
  /** True on the first load, before any data exists. */
  loading: boolean
}

const SKELETON_CARDS = 6

/** Compact (phone) rendering of the supplier list: legal name, tax ID and status on each card. */
export function SupplierCardList({ suppliers, loading, onDeactivate, onActivate }: SupplierCardListProps) {
  const cards = useRowMotion('suppliers-cards', !loading && suppliers.length > 0, suppliers.length)
  const navigate = useNavigate()
  const canWrite = useCan('suppliers.write')

  if (loading) {
    return (
      <div className="flex flex-col divide-y" aria-hidden="true">
        {placeholderKeys(SKELETON_CARDS).map((key) => (
          <div key={key} className="flex flex-col gap-2 p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <ul className="flex flex-col divide-y">
      {suppliers.map((supplier, index) => (
        <motion.li
          {...cards.rowProps(index, String(supplier.id))}
          key={supplier.id}
          className={`flex flex-col gap-2 p-4 transition-colors hover:bg-muted/40${canWrite ? ' cursor-pointer' : ''}`}
          onClick={canWrite ? () => void navigate(`/suppliers/${supplier.id}/edit`) : undefined}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              {canWrite ? (
                <Link
                  to={`/suppliers/${supplier.id}/edit`}
                  className="truncate font-medium hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  {supplier.legalName}
                </Link>
              ) : (
                <span className="truncate font-medium">{supplier.legalName}</span>
              )}
              {supplier.taxId ? <span className="text-xs text-muted-foreground">{supplier.taxId}</span> : null}
            </div>
            <SupplierRowActions supplier={supplier} onDeactivate={onDeactivate} onActivate={onActivate} />
          </div>
          <div>
            <StatusBadge active={supplier.active} />
          </div>
        </motion.li>
      ))}
    </ul>
  )
}
