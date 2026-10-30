import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useCan } from '@/app/auth/permissions'
import { useCurrency } from '@/app/currency-provider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useFormatQuantity } from '@/features/stock/format'
import { isApiError } from '@/shared/api/http'
import { Pill } from '@/shared/components/Pill'
import { useCancelSale, useSale } from '../queries'
import type { Sale } from '../types'

function CancelForm({ sale, onDone, onBack }: { sale: Sale; onDone: () => void; onBack: () => void }) {
  const { t } = useTranslation('sales')
  const { t: tc } = useTranslation()
  const cancel = useCancelSale(sale.id)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (reason.trim() === '') {
      setError(t('cancel.reasonRequired'))
      return
    }
    setError(null)
    try {
      await cancel.mutateAsync(reason.trim())
      toast.success(t('cancel.done', { number: sale.number }))
      onDone()
    } catch (failure) {
      if (isApiError(failure) && failure.status === 403) return
      const message = isApiError(failure) ? Object.values(failure.errors ?? {})[0] ?? failure.detail : undefined
      setError(message ?? tc('errors.unexpected'))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert className="rounded-2xl">
        <AlertDescription>{t('cancel.description')}</AlertDescription>
      </Alert>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="cancel-reason">{t('cancel.reason')}</FieldLabel>
        <Textarea
          id="cancel-reason"
          autoFocus
          rows={2}
          maxLength={500}
          placeholder={t('cancel.reasonPlaceholder')}
          aria-invalid={error ? true : undefined}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        {error ? <FieldError>{error}</FieldError> : null}
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onBack}>
          {t('cancel.back')}
        </Button>
        <Button type="button" variant="destructive" loading={cancel.isPending} onClick={() => void submit()}>
          {t('cancel.confirm')}
        </Button>
      </DialogFooter>
    </div>
  )
}

function SaleDetail({ sale }: { sale: Sale }) {
  const { t, i18n } = useTranslation('sales')
  const { formatMoney } = useCurrency()
  const format = useFormatQuantity()
  const date = useMemo(() => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }), [i18n.language])
  const totalDiscount = sale.itemsDiscount + sale.discount
  return (
    <div className="flex flex-col gap-4">
      {sale.status === 'CANCELLED' ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertDescription>
            {t('detail.cancelledBy', { name: sale.cancelledByName ?? '—', date: sale.cancelledAt ? date.format(new Date(sale.cancelledAt)) : '' })}
            {sale.cancelReason ? ` — “${sale.cancelReason}”` : ''}
          </AlertDescription>
        </Alert>
      ) : null}
      <table className="w-full text-sm tabular-nums">
        <caption className="sr-only">{t('detail.items')}</caption>
        <thead>
          <tr className="text-muted-foreground text-left text-xs">
            <th className="pb-2 font-medium">{t('detail.items')}</th>
            <th className="pb-2 pl-3 text-right font-medium">{t('detail.quantity')}</th>
            <th className="pb-2 pl-3 text-right font-medium">{t('detail.lineTotal')}</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item) => (
            <tr key={item.id} className="border-t align-top">
              <td className="py-2.5">
                <span className="font-semibold">{item.name}</span>
                <span className="text-muted-foreground block text-xs">
                  {item.sku} · {formatMoney(item.unitPrice)}
                  {item.productId === null ? ` · ${t('detail.deletedProduct')}` : ''}
                </span>
              </td>
              <td className="py-2.5 pl-3 text-right whitespace-nowrap">{format(item.quantity, item.unitOfMeasure)}</td>
              <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                {formatMoney(item.total)}
                {item.discount > 0 ? <span className="text-muted-foreground block text-xs">−{formatMoney(item.discount)}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="bg-muted flex flex-col gap-1.5 rounded-2xl p-4 text-sm tabular-nums">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('cart.subtotal')}</dt>
          <dd>{formatMoney(sale.subtotal)}</dd>
        </div>
        {totalDiscount > 0 ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('cart.discount')}</dt>
            <dd>−{formatMoney(totalDiscount)}</dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between">
          <dt className="font-semibold">{t('cart.total')}</dt>
          <dd className="text-xl font-extrabold">{formatMoney(sale.total)}</dd>
        </div>
        <div className="flex justify-between border-t pt-1.5">
          <dt className="text-muted-foreground">{t(`payment.${sale.paymentMethod}`)}</dt>
          <dd>{formatMoney(sale.amountPaid)}</dd>
        </div>
        {sale.change > 0 ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('payment.change')}</dt>
            <dd>{formatMoney(sale.change)}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

interface SaleDetailDialogProps {
  saleId: number | null
  onOpenChange: (open: boolean) => void
}

/** A sale's items, totals and payment; managers can cancel it from here (with a reason). */
export function SaleDetailDialog({ saleId, onOpenChange }: SaleDetailDialogProps) {
  const { t, i18n } = useTranslation('sales')
  const canCancel = useCan('sales.cancel')
  const { data: sale, isPending, isError } = useSale(saleId)
  const [cancelling, setCancelling] = useState(false)
  const date = useMemo(() => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }), [i18n.language])

  return (
    <Dialog
      open={saleId !== null}
      onOpenChange={(open) => {
        if (!open) setCancelling(false)
        onOpenChange(open)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {sale ? (cancelling ? t('cancel.title', { number: sale.number }) : t('detail.title', { number: sale.number })) : '…'}
            {sale && !cancelling ? (
              <Pill tone={sale.status === 'CANCELLED' ? 'danger' : 'ok'}>{t(`history.status.${sale.status}`)}</Pill>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {sale
              ? `${date.format(new Date(sale.createdAt))}${sale.createdByName ? ` · ${t('detail.closedBy', { name: sale.createdByName })}` : ''}`
              : null}
          </DialogDescription>
        </DialogHeader>
        {isError ? (
          <p role="alert" className="text-destructive text-sm">
            {t('detail.error')}
          </p>
        ) : isPending || !sale ? (
          <div className="flex flex-col gap-3" aria-hidden="true">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        ) : cancelling ? (
          <CancelForm sale={sale} onBack={() => setCancelling(false)} onDone={() => setCancelling(false)} />
        ) : (
          <>
            <SaleDetail sale={sale} />
            {canCancel && sale.status === 'COMPLETED' ? (
              <DialogFooter>
                <Button type="button" variant="outline" className="text-destructive" onClick={() => setCancelling(true)}>
                  {t('cancel.open')}
                </Button>
              </DialogFooter>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
