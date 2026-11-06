import { RiArrowRightLine } from '@remixicon/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useCurrency } from '@/app/currency-provider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useFormatQuantity } from '@/features/stock/format'
import { cn } from '@/lib/utils'
import { isApiError } from '@/shared/api/http'
import { averageCost, parseDecimal } from '../cost'
import { useReceivePurchaseOrder } from '../queries'
import type { PurchaseOrder, PurchaseOrderItem } from '../types'

interface Arrival {
  quantity: string
  cost: string
}

function decimalText(value: number): string {
  return String(value)
}

/**
 * What arrived: for each item the quantity (all of it by default) and the cost paid, with the stock and
 * cost each product will have. Confirming enters it all into stock at once.
 */
export function ReceiveDialog({ order, open, onOpenChange }: { order: PurchaseOrder; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('purchases')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('receive.title', { number: order.number })}</DialogTitle>
          <DialogDescription>{t('receive.description', { supplier: order.supplierName })}</DialogDescription>
        </DialogHeader>
        {open ? <ReceiveForm order={order} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function ReceiveForm({ order, onDone }: { order: PurchaseOrder; onDone: () => void }) {
  const { t } = useTranslation('purchases')
  const { t: tc } = useTranslation()
  const { formatMoney } = useCurrency()
  const format = useFormatQuantity()
  const receive = useReceivePurchaseOrder(order.id)
  const [arrivals, setArrivals] = useState<Record<number, Arrival>>(() =>
    Object.fromEntries(order.items.map((item) => [item.id, { quantity: decimalText(item.quantity), cost: decimalText(item.unitCost) }])),
  )
  const [updateCosts, setUpdateCosts] = useState(true)

  const parsed = order.items.map((item) => ({
    item,
    quantity: parseDecimal(arrivals[item.id].quantity),
    cost: parseDecimal(arrivals[item.id].cost),
  }))
  const invalid = parsed.some(({ quantity, cost }) => Number.isNaN(quantity) || Number.isNaN(cost))
  const total = parsed.reduce((sum, { quantity, cost }) => sum + (Number.isNaN(quantity) || Number.isNaN(cost) ? 0 : quantity * cost), 0)

  function change(item: PurchaseOrderItem, field: keyof Arrival, value: string) {
    setArrivals((current) => ({ ...current, [item.id]: { ...current[item.id], [field]: value } }))
  }

  async function confirm() {
    try {
      await receive.mutateAsync({
        items: parsed.map(({ item, quantity, cost }) => ({ itemId: item.id, receivedQuantity: quantity, unitCost: cost })),
        updateCosts,
      })
      toast.success(t('receive.done', { number: order.number }))
      onDone()
    } catch (error) {
      const message = isApiError(error) ? (Object.values(error.errors ?? {})[0] ?? error.detail) : undefined
      toast.error(message ?? tc('errors.unexpected'))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="-mx-1 flex max-h-[55vh] flex-col gap-2 overflow-y-auto px-1">
        {parsed.map(({ item, quantity, cost }) => {
          const short = !Number.isNaN(quantity) && quantity < item.quantity
          const costChanged = !Number.isNaN(cost) && cost !== item.unitCost
          const newCost =
            updateCosts && item.productStock !== null && !Number.isNaN(quantity) && !Number.isNaN(cost) && quantity > 0
              ? averageCost(item.productStock, item.productCost, quantity, cost)
              : null
          return (
            <li key={item.id} className="bg-muted/50 grid gap-3 rounded-2xl p-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:items-center">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-semibold">{item.name}</span>
                <span className="text-muted-foreground text-xs">
                  {t('receive.ordered', { value: format(item.quantity, item.unitOfMeasure), cost: formatMoney(item.unitCost) })}
                </span>
                {item.productId === null ? (
                  <span className="text-muted-foreground text-xs italic">{t('receive.deleted')}</span>
                ) : newCost !== null && item.productStock !== null ? (
                  <span className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
                    {t('receive.stockAfter', { value: format(item.productStock + quantity, item.unitOfMeasure) })} ·{' '}
                    {item.productCost === null ? (
                      t('receive.costNew', { value: formatMoney(newCost) })
                    ) : (
                      <>
                        {t('receive.cost')} {formatMoney(item.productCost)}
                        <RiArrowRightLine className="size-3" aria-label={t('receive.becomes')} />
                        <span className={cn('font-semibold', newCost !== item.productCost && 'text-foreground')}>{formatMoney(newCost)}</span>
                      </>
                    )}
                  </span>
                ) : null}
              </span>
              <div className="flex flex-col gap-1 text-xs font-semibold">
                <span aria-hidden="true" className={cn('text-muted-foreground', short && 'text-warning-foreground')}>
                  {t('receive.quantity')}
                </span>
                <Input
                  inputMode="decimal"
                  aria-label={t('receive.quantityOf', { name: item.name })}
                  aria-invalid={Number.isNaN(quantity) ? true : undefined}
                  className="h-9"
                  value={arrivals[item.id].quantity}
                  onChange={(event) => change(item, 'quantity', event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1 text-xs font-semibold">
                <span aria-hidden="true" className={cn('text-muted-foreground', costChanged && 'text-warning-foreground')}>
                  {t('receive.unitCost')}
                </span>
                <Input
                  inputMode="decimal"
                  aria-label={t('receive.costOf', { name: item.name })}
                  aria-invalid={Number.isNaN(cost) ? true : undefined}
                  className="h-9"
                  value={arrivals[item.id].cost}
                  onChange={(event) => change(item, 'cost', event.target.value)}
                />
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex items-center gap-3 text-sm">
        <Switch id="receive-update-costs" checked={updateCosts} onCheckedChange={setUpdateCosts} aria-describedby="receive-costs-hint" />
        <span className="flex flex-col">
          <label htmlFor="receive-update-costs" className="font-semibold">
            {t('receive.updateCosts')}
          </label>
          <span id="receive-costs-hint" className="text-muted-foreground text-xs">
            {t('receive.updateCostsHint')}
          </span>
        </span>
      </div>

      <DialogFooter className="items-center sm:justify-between">
        <span className="text-sm">
          {t('receive.total')} <span className="font-extrabold tabular-nums">{formatMoney(total)}</span>
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onDone}>
            {tc('actions.cancel')}
          </Button>
          <Button disabled={invalid} loading={receive.isPending} onClick={() => void confirm()}>
            {t('receive.confirm')}
          </Button>
        </div>
      </DialogFooter>
    </div>
  )
}
