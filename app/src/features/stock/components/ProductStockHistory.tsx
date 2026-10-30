import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Panel } from '@/shared/components/Panel'
import { useStockMovements } from '../queries'
import { MovementList } from './MovementList'

const RECENT = 5

/** The latest movements of one product, under its edit form, linking to the full filtered history. */
export function ProductStockHistory({ productId }: { productId: number }) {
  const { t } = useTranslation('stock')
  const { data, isPending, isError } = useStockMovements({ productId, page: 0, size: RECENT })
  const total = data?.totalElements ?? 0
  return (
    <Panel
      title={t('history.title')}
      description={t('history.description')}
      padding="flush"
      actions={
        total > 0 ? (
          <Link to={`/stock?productId=${productId}`} className="text-primary font-semibold hover:underline">
            {t('history.seeAll')} ({total})
          </Link>
        ) : null
      }
    >
      {isError ? (
        <p className="text-muted-foreground px-3 pb-2 text-sm">{t('list.error')}</p>
      ) : !isPending && total === 0 ? (
        <p className="text-muted-foreground px-3 pb-2 text-sm">{t('history.empty')}</p>
      ) : (
        <MovementList movements={data?.content ?? []} loading={isPending} showProduct={false} skeletonRows={3} />
      )}
    </Panel>
  )
}
