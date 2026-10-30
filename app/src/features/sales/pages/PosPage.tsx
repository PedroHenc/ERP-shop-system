import { RiCheckLine } from '@remixicon/react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useCurrency } from '@/app/currency-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isApiError } from '@/shared/api/http'
import { PageHeader } from '@/shared/components/PageHeader'
import { Panel } from '@/shared/components/Panel'
import { SegmentedControl } from '@/shared/components/SegmentedControl'
import { type CartLine, addToCart, cartTotals, lineProblem, parseAmount, removeLine, setQuantity } from '../cart'
import { CartLines } from '../components/CartLines'
import { ProductSearch } from '../components/ProductSearch'
import { useCreateSale } from '../queries'
import { PAYMENT_METHODS, type PaymentMethod, type Sale } from '../types'

/** Field errors of a refused sale (stock, discount, amount received) as one message, or the API's detail. */
function failureText(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    const messages = Object.values(error.errors ?? {})
    if (messages.length > 0) return messages.join(' · ')
    if (error.detail) return error.detail
  }
  return fallback
}

/** The cashier's screen: search or scan on the left, the sale and its payment on the right. */
export function PosPage() {
  const { t } = useTranslation('sales')
  const { t: tc } = useTranslation()
  const { formatMoney } = useCurrency()
  const searchRef = useRef<HTMLInputElement>(null)
  const create = useCreateSale()
  const [lines, setLines] = useState<CartLine[]>([])
  const [discountText, setDiscountText] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [receivedText, setReceivedText] = useState('')
  const [failure, setFailure] = useState<string | null>(null)
  const [done, setDone] = useState<Sale | null>(null)

  const discount = discountText.trim() === '' ? 0 : parseAmount(discountText)
  const { subtotal, total } = cartTotals(lines, Number.isNaN(discount) ? 0 : discount)
  const received = parseAmount(receivedText)
  const discountInvalid = Number.isNaN(discount) || total < 0
  const cashShort = method === 'CASH' && (Number.isNaN(received) || received < total)
  const lineProblems = lines.some((line) => lineProblem(line) !== null)
  const canClose = lines.length > 0 && !discountInvalid && !cashShort && !lineProblems && !create.isPending

  function resetSale() {
    setLines([])
    setDiscountText('')
    setReceivedText('')
    setMethod('CASH')
    setFailure(null)
    setDone(null)
    searchRef.current?.focus()
  }

  async function closeSale() {
    setFailure(null)
    try {
      const sale = await create.mutateAsync({
        items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        discount: discount > 0 ? discount : undefined,
        paymentMethod: method,
        amountPaid: method === 'CASH' ? received : undefined,
      })
      setDone(sale)
    } catch (error) {
      // A 403 already got the global permission toast.
      if (!(isApiError(error) && error.status === 403)) setFailure(failureText(error, tc('errors.unexpected')))
    }
  }

  const itemCount = lines.length

  return (
    <>
      <PageHeader title={t('pos.title')} description={t('pos.description')} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <ProductSearch
          inputRef={searchRef}
          onPick={(product) => {
            setLines((current) => addToCart(current, product))
            setFailure(null)
            toast.success(t('pos.added', { name: product.name }), { duration: 1200 })
          }}
        />

        <Panel
          title={t('cart.title')}
          description={t('cart.items', { count: itemCount })}
          padding="flush"
          className="lg:sticky lg:top-24"
          actions={
            lines.length > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={resetSale}>
                {t('cart.clear')}
              </Button>
            ) : null
          }
        >
          <CartLines
            lines={lines}
            onQuantity={(productId, quantity) => setLines((current) => setQuantity(current, productId, quantity))}
            onRemove={(productId) => setLines((current) => removeLine(current, productId))}
          />

          <div className="flex flex-col gap-4 border-t px-3 pt-4">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('cart.subtotal')}</dt>
                <dd className="tabular-nums">{formatMoney(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>
                  <Label htmlFor="pos-discount" className="text-muted-foreground font-normal">
                    {t('cart.discount')}
                  </Label>
                </dt>
                <dd>
                  <Input
                    id="pos-discount"
                    inputMode="decimal"
                    placeholder="0,00"
                    aria-invalid={discountInvalid || undefined}
                    className="h-8 w-28 rounded-full text-right tabular-nums"
                    value={discountText}
                    onChange={(event) => setDiscountText(event.target.value)}
                  />
                </dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="font-semibold">{t('cart.total')}</dt>
                <dd className="text-[32px] leading-none font-extrabold tracking-[-0.02em] tabular-nums" aria-live="polite">
                  {formatMoney(Math.max(total, 0))}
                </dd>
              </div>
              {discountInvalid && discountText.trim() !== '' ? (
                <p className="text-destructive text-xs font-semibold">{t('payment.invalidDiscount')}</p>
              ) : null}
            </dl>

            <SegmentedControl
              label={t('payment.label')}
              fullWidth
              value={method}
              onChange={setMethod}
              options={PAYMENT_METHODS.map((value) => ({ value, label: t(`payment.${value}`) }))}
            />

            {method === 'CASH' ? (
              <div className="grid grid-cols-2 items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pos-received" className="text-[13px] font-semibold">
                    {t('payment.received')}
                  </Label>
                  <Input
                    id="pos-received"
                    inputMode="decimal"
                    placeholder={formatMoney(Math.max(total, 0))}
                    className="h-11 rounded-full text-right text-base tabular-nums"
                    value={receivedText}
                    onChange={(event) => setReceivedText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && canClose) void closeSale()
                    }}
                  />
                </div>
                <div className="bg-muted flex h-11 flex-col justify-center rounded-2xl px-4" aria-live="polite">
                  {Number.isNaN(received) || receivedText.trim() === '' ? (
                    <span className="text-muted-foreground text-sm">{t('payment.change')}</span>
                  ) : received >= total ? (
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-muted-foreground text-xs">{t('payment.change')}</span>
                      <span className="font-extrabold tabular-nums">{formatMoney(received - total)}</span>
                    </span>
                  ) : (
                    <span className="text-destructive text-sm font-semibold">
                      {t('payment.short', { value: formatMoney(total - received) })}
                    </span>
                  )}
                </div>
              </div>
            ) : null}

            {failure ? (
              <Alert variant="destructive" className="rounded-2xl">
                <AlertTitle>{t('checkout.error')}</AlertTitle>
                <AlertDescription>{failure}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="button"
              size="lg"
              className="h-13 rounded-full text-base font-bold"
              disabled={!canClose}
              loading={create.isPending}
              onClick={() => void closeSale()}
            >
              {create.isPending ? t('checkout.submitting') : `${t('checkout.submit')} · ${formatMoney(Math.max(total, 0))}`}
            </Button>
          </div>
        </Panel>
      </div>

      <Dialog open={done !== null} onOpenChange={(open) => !open && resetSale()}>
        <DialogContent className="sm:max-w-md">
          {done ? (
            <>
              <DialogHeader className="items-center text-center">
                <span className="bg-success-soft text-success-foreground mb-2 flex size-14 items-center justify-center rounded-full">
                  <RiCheckLine className="size-7" aria-hidden="true" />
                </span>
                <DialogTitle className="text-xl font-extrabold">{t('checkout.doneTitle', { number: done.number })}</DialogTitle>
                <DialogDescription>
                  {t('checkout.doneDescription', { count: done.items.length, method: t(`payment.${done.paymentMethod}`) })}
                </DialogDescription>
              </DialogHeader>
              <dl className="bg-muted flex flex-col gap-2 rounded-2xl p-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t('cart.total')}</dt>
                  <dd className="font-extrabold tabular-nums">{formatMoney(done.total)}</dd>
                </div>
                {done.paymentMethod === 'CASH' ? (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t('checkout.paid')}</dt>
                      <dd className="tabular-nums">{formatMoney(done.amountPaid)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <dt className="font-semibold">{t('payment.change')}</dt>
                      <dd className="text-2xl font-extrabold tabular-nums">{formatMoney(done.change)}</dd>
                    </div>
                  </>
                ) : null}
              </dl>
              <DialogFooter>
                <Button type="button" className="w-full rounded-full" autoFocus onClick={resetSale}>
                  {t('checkout.newSale')}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
