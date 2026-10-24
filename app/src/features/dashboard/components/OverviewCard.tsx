import { RiAddLine } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useCan } from '@/app/auth/permissions'
import { ADD_ICON_MOTION, Button } from '@/components/ui/button'

interface OverviewCardProps {
  activeBrands: number
  activeSuppliers: number | null
  formatCount: (value: number) => string
}

export function OverviewCard({ activeBrands, activeSuppliers, formatCount }: OverviewCardProps) {
  const { t } = useTranslation()
  const canWriteProducts = useCan('products.write')
  const canWriteBrands = useCan('brands.write')
  const canWriteSuppliers = useCan('suppliers.write')

  return (
    <section
      aria-labelledby="overview-title"
      className="flex h-full flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 shadow-[var(--shadow-card)]"
    >
      <h2 id="overview-title" className="text-base font-semibold">
        {t('home.overview.title')}
      </h2>
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">{t('home.overview.activeBrands')}</dt>
          <dd className="font-medium tabular-nums">{formatCount(activeBrands)}</dd>
        </div>
        {activeSuppliers !== null ? (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t('home.overview.activeSuppliers')}</dt>
            <dd className="font-medium tabular-nums">{formatCount(activeSuppliers)}</dd>
          </div>
        ) : null}
      </dl>
      {canWriteProducts || canWriteBrands || canWriteSuppliers ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">{t('home.overview.quickActions')}</h3>
          {canWriteProducts ? (
            <Button asChild variant="outline" className="justify-start">
              <Link to="/products/new">
                <RiAddLine className={ADD_ICON_MOTION} />
                {t('home.overview.newProduct')}
              </Link>
            </Button>
          ) : null}
          {canWriteBrands ? (
            <Button asChild variant="outline" className="justify-start">
              <Link to="/brands" state={{ newBrand: true }}>
                <RiAddLine className={ADD_ICON_MOTION} />
                {t('home.overview.newBrand')}
              </Link>
            </Button>
          ) : null}
          {canWriteSuppliers ? (
            <Button asChild variant="outline" className="justify-start">
              <Link to="/suppliers/new">
                <RiAddLine className={ADD_ICON_MOTION} />
                {t('home.overview.newSupplier')}
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
