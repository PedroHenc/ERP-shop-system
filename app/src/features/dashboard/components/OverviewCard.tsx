import { RiAddLine } from '@remixicon/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useCan } from '@/app/auth/permissions'
import { ADD_ICON_MOTION } from '@/components/ui/button'

interface OverviewCardProps {
  activeBrands: number
  activeSuppliers: number | null
  formatCount: (value: number) => string
}

function Shortcut({ to, state, children }: { to: string; state?: unknown; children: ReactNode }) {
  return (
    <Link
      to={to}
      state={state}
      className="group/button flex items-center gap-2 rounded-full bg-white/12 px-4 py-2.5 text-sm font-semibold transition-colors duration-200 outline-none hover:bg-white/22 focus-visible:ring-3 focus-visible:ring-white/40 dark:bg-black/10 dark:hover:bg-black/20"
    >
      <RiAddLine className={`size-4 ${ADD_ICON_MOTION}`} aria-hidden="true" />
      {children}
    </Link>
  )
}

/** Catalog counts and creation shortcuts, on the dark (ink) card of the design. */
export function OverviewCard({ activeBrands, activeSuppliers, formatCount }: OverviewCardProps) {
  const { t } = useTranslation()
  const canWriteProducts = useCan('products.write')
  const canWriteBrands = useCan('brands.write')
  const canWriteSuppliers = useCan('suppliers.write')

  return (
    <section
      aria-labelledby="overview-title"
      className="bg-foreground text-background flex h-full flex-col gap-5 rounded-xl p-6"
    >
      <h2 id="overview-title" className="text-lg font-extrabold">
        {t('home.overview.title')}
      </h2>
      <dl className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <dt className="text-background/65 text-[13px]">{t('home.overview.activeBrands')}</dt>
          <dd className="text-[28px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">{formatCount(activeBrands)}</dd>
        </div>
        {activeSuppliers !== null ? (
          <div className="flex flex-col gap-1">
            <dt className="text-background/65 text-[13px]">{t('home.overview.activeSuppliers')}</dt>
            <dd className="text-[28px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">
              {formatCount(activeSuppliers)}
            </dd>
          </div>
        ) : null}
      </dl>
      {canWriteProducts || canWriteBrands || canWriteSuppliers ? (
        <div className="flex flex-col gap-2.5">
          <h3 className="text-background/65 text-xs font-semibold">{t('home.overview.quickActions')}</h3>
          <div className="flex flex-wrap gap-2">
            {canWriteProducts ? <Shortcut to="/products/new">{t('home.overview.newProduct')}</Shortcut> : null}
            {canWriteBrands ? (
              <Shortcut to="/brands" state={{ newBrand: true }}>
                {t('home.overview.newBrand')}
              </Shortcut>
            ) : null}
            {canWriteSuppliers ? <Shortcut to="/suppliers/new">{t('home.overview.newSupplier')}</Shortcut> : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
