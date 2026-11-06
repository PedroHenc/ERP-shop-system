import { RiClipboardLine, RiCloseCircleLine, RiDeleteBinLine, RiInboxUnarchiveLine, RiSendPlaneLine } from '@remixicon/react'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useCan } from '@/app/auth/permissions'
import { useCurrency } from '@/app/currency-provider'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Product, UnitOfMeasure } from '@/features/products/types'
import { useFormatQuantity } from '@/features/stock/format'
import { useStore } from '@/features/store/queries'
import { cn } from '@/lib/utils'
import { isApiError } from '@/shared/api/http'
import { PageHeader } from '@/shared/components/PageHeader'
import { UnsavedChangesDialog } from '@/shared/components/UnsavedChangesDialog'
import { FormSkeleton } from '@/shared/forms/FormSkeleton'
import { ProductPicker } from '../components/ProductPicker'
import { PurchaseStatusPill } from '../components/PurchaseStatusPill'
import { ReceiveDialog } from '../components/ReceiveDialog'
import { parseDecimal } from '../cost'
import {
  useActiveSuppliers,
  useCancelPurchaseOrder,
  usePurchaseOrder,
  useReorderSuggestions,
  useSavePurchaseOrder,
  useSendPurchaseOrder,
} from '../queries'
import type { PurchaseOrder, PurchaseOrderRequest } from '../types'

const COUNTABLE: ReadonlySet<UnitOfMeasure> = new Set(['UNIT', 'BOX', 'PIECE'])

interface Line {
  productId: number
  sku: string
  name: string
  unitOfMeasure: UnitOfMeasure
  stock: number | null
  quantity: string
  unitCost: string
}

interface Draft {
  supplierId: number | null
  notes: string
  lines: Line[]
}

type Errors = { supplier?: string; items?: string; lines: Record<number, { quantity?: string; unitCost?: string }> }

/** /purchases/new (?reorder=1 starts from the reorder suggestions) and /purchases/:id. */
export function PurchaseOrderPage() {
  const { t } = useTranslation('purchases')
  const { id } = useParams()
  const orderId = id === undefined ? null : Number(id)
  const canWrite = useCan('purchases.write')
  const { data: order, isPending, error } = usePurchaseOrder(orderId)

  if (orderId === null) return <NewOrder />
  if (isPending) {
    return (
      <>
        <PageHeader title={t('form.loading')} />
        <FormSkeleton />
      </>
    )
  }
  if (error || !order) {
    const notFound = isApiError(error) && error.status === 404
    return (
      <>
        <PageHeader title={t('title')} />
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>{notFound ? t('form.notFound') : t('list.error')}</AlertTitle>
          <AlertDescription>
            <Link to="/purchases" className="underline">
              {t('form.back')}
            </Link>
          </AlertDescription>
        </Alert>
      </>
    )
  }
  // Keyed on the status: after send/receive the page switches to the read-only view with fresh state.
  return order.status === 'DRAFT' && canWrite ? <Editor key={order.id} order={order} /> : <OrderView key={order.status} order={order} />
}

function NewOrder() {
  const [params] = useSearchParams()
  const reorder = params.get('reorder') === '1'
  const { data: suggestions, isPending } = useReorderSuggestions()
  if (reorder && isPending) return <FormSkeleton />
  const lines: Line[] = reorder
    ? (suggestions ?? []).map((s) => ({
        productId: s.productId,
        sku: s.sku,
        name: s.name,
        unitOfMeasure: s.unitOfMeasure,
        stock: s.stockQuantity,
        quantity: String(s.suggestedQuantity),
        unitCost: s.costPrice === null ? '' : String(s.costPrice),
      }))
    : []
  return <Editor order={null} initialLines={lines} />
}

function toDraft(order: PurchaseOrder | null, lines: Line[] = []): Draft {
  if (!order) return { supplierId: null, notes: '', lines }
  return {
    supplierId: order.supplierId,
    notes: order.notes ?? '',
    lines: order.items
      .filter((item) => item.productId !== null)
      .map((item) => ({
        productId: item.productId as number,
        sku: item.sku,
        name: item.name,
        unitOfMeasure: item.unitOfMeasure,
        stock: item.productStock,
        quantity: String(item.quantity),
        unitCost: String(item.unitCost),
      })),
  }
}

function Editor({ order, initialLines }: { order: PurchaseOrder | null; initialLines?: Line[] }) {
  const { t } = useTranslation('purchases')
  const { t: tc } = useTranslation()
  const navigate = useNavigate()
  const { formatMoney } = useCurrency()
  const format = useFormatQuantity()
  const [initial] = useState(() => toDraft(order, initialLines))
  const [draft, setDraft] = useState<Draft>(initial)
  const [errors, setErrors] = useState<Errors>({ lines: {} })
  const [receiving, setReceiving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const save = useSavePurchaseOrder(order?.id ?? null)
  const send = useSendPurchaseOrder()
  const { data: suppliers = [] } = useActiveSuppliers()
  const { data: suggestions = [] } = useReorderSuggestions()
  const leaving = useRef(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const busy = save.isPending || send.isPending

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname,
  )

  const added = useMemo(() => new Set(draft.lines.map((line) => line.productId)), [draft.lines])
  const missingSuggestions = suggestions.filter((s) => !added.has(s.productId))
  const total = draft.lines.reduce((sum, line) => {
    const quantity = parseDecimal(line.quantity)
    const cost = parseDecimal(line.unitCost)
    return Number.isNaN(quantity) || Number.isNaN(cost) ? sum : sum + Math.round(quantity * cost * 100) / 100
  }, 0)
  const supplierOptions =
    order && !suppliers.some((s) => s.id === order.supplierId)
      ? [...suppliers, { id: order.supplierId, legalName: order.supplierName, tradeName: null }]
      : suppliers

  function addProduct(product: Product) {
    setDraft((current) => ({
      ...current,
      lines: [
        ...current.lines,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          unitOfMeasure: product.unitOfMeasure,
          stock: product.stockQuantity,
          quantity: '1',
          unitCost: product.costPrice === null ? '' : String(product.costPrice),
        },
      ],
    }))
    setErrors((current) => ({ ...current, items: undefined }))
  }

  function addSuggestions() {
    setDraft((current) => ({
      ...current,
      lines: [
        ...current.lines,
        ...missingSuggestions.map((s) => ({
          productId: s.productId,
          sku: s.sku,
          name: s.name,
          unitOfMeasure: s.unitOfMeasure,
          stock: s.stockQuantity,
          quantity: String(s.suggestedQuantity),
          unitCost: s.costPrice === null ? '' : String(s.costPrice),
        })),
      ],
    }))
  }

  function updateLine(productId: number, field: 'quantity' | 'unitCost', value: string) {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.productId === productId ? { ...line, [field]: value } : line)),
    }))
    setErrors((current) => ({ ...current, lines: { ...current.lines, [productId]: { ...current.lines[productId], [field]: undefined } } }))
  }

  /** The request, or null after showing what to fix. */
  function validate(): PurchaseOrderRequest | null {
    const next: Errors = { lines: {} }
    if (draft.supplierId === null) next.supplier = t('form.supplierRequired')
    if (draft.lines.length === 0) next.items = t('form.itemsRequired')
    const items = draft.lines.map((line) => {
      const quantity = parseDecimal(line.quantity)
      const unitCost = parseDecimal(line.unitCost)
      const lineErrors: { quantity?: string; unitCost?: string } = {}
      if (Number.isNaN(quantity) || quantity <= 0) lineErrors.quantity = t('form.quantityInvalid')
      else if (COUNTABLE.has(line.unitOfMeasure) && !Number.isInteger(quantity)) lineErrors.quantity = t('form.wholeUnits')
      if (Number.isNaN(unitCost)) lineErrors.unitCost = t('form.costInvalid')
      if (lineErrors.quantity || lineErrors.unitCost) next.lines[line.productId] = lineErrors
      return { productId: line.productId, quantity, unitCost }
    })
    setErrors(next)
    const valid = !next.supplier && !next.items && Object.keys(next.lines).length === 0
    return valid ? { supplierId: draft.supplierId as number, notes: draft.notes.trim() || null, items } : null
  }

  async function persist(): Promise<PurchaseOrder | null> {
    const body = validate()
    if (!body) return null
    try {
      return await save.mutateAsync(body)
    } catch (error) {
      if (isApiError(error) && error.errors) {
        const message = Object.values(error.errors)[0]
        if (error.errors.supplierId) setErrors((current) => ({ ...current, supplier: error.errors?.supplierId }))
        else setErrors((current) => ({ ...current, items: message }))
      } else if (!(isApiError(error) && error.status === 403)) {
        toast.error(tc('errors.unexpected'))
      }
      return null
    }
  }

  async function saveDraft() {
    const saved = await persist()
    if (!saved) return
    toast.success(t('form.saved', { number: saved.number }))
    leaving.current = true
    if (!order) void navigate(`/purchases/${saved.id}`, { replace: true })
    else leaving.current = false
  }

  async function saveAndSend() {
    const saved = await persist()
    if (!saved) return
    leaving.current = true
    try {
      await send.mutateAsync(saved.id)
      toast.success(t('form.sent', { number: saved.number }))
    } catch {
      // Saved as a draft all the same: the order page offers to send it again.
      toast.error(tc('errors.unexpected'))
    }
    if (!order) void navigate(`/purchases/${saved.id}`, { replace: true })
  }

  async function saveAndReceive() {
    if (dirty) {
      const saved = await persist()
      if (!saved) return
      if (!order) {
        leaving.current = true
        void navigate(`/purchases/${saved.id}`, { replace: true })
        return
      }
    }
    setReceiving(true)
  }

  return (
    <>
      <PageHeader
        title={order ? t('number', { number: order.number }) : t('form.newTitle')}
        description={order ? undefined : t('form.newDescription')}
        actions={order ? <PurchaseStatusPill status={order.status} /> : undefined}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle>{t('form.items', { count: draft.lines.length })}</CardTitle>
            {missingSuggestions.length > 0 ? (
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={addSuggestions}>
                {t('form.addSuggestions', { count: missingSuggestions.length })}
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ProductPicker onPick={addProduct} exclude={added} />
            {errors.items ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.items}
              </p>
            ) : null}
            {draft.lines.length === 0 ? (
              <p className="text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm text-pretty">{t('form.empty')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {draft.lines.map((line) => {
                  const quantity = parseDecimal(line.quantity)
                  const cost = parseDecimal(line.unitCost)
                  const lineTotal = Number.isNaN(quantity) || Number.isNaN(cost) ? null : quantity * cost
                  const lineErrors = errors.lines[line.productId] ?? {}
                  return (
                    <li
                      key={line.productId}
                      className="bg-muted/50 grid grid-cols-2 items-start gap-x-3 gap-y-2 rounded-2xl p-3 sm:grid-cols-[minmax(0,1fr)_6.5rem_7rem_6.5rem_2.25rem]"
                    >
                      <span className="col-span-2 flex min-w-0 flex-col sm:col-span-1 sm:pt-1">
                        <span className="truncate font-semibold">{line.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {line.sku}
                          {line.stock !== null ? ` · ${t('form.inStock', { value: format(line.stock, line.unitOfMeasure) })}` : ''}
                        </span>
                      </span>
                      <NumberField
                        label={t('form.quantity')}
                        accessibleLabel={t('form.quantityOf', { name: line.name })}
                        suffix={t(`units.${line.unitOfMeasure}`, { ns: 'products' })}
                        value={line.quantity}
                        error={lineErrors.quantity}
                        onChange={(value) => updateLine(line.productId, 'quantity', value)}
                      />
                      <NumberField
                        label={t('form.unitCost')}
                        accessibleLabel={t('form.costOf', { name: line.name })}
                        value={line.unitCost}
                        error={lineErrors.unitCost}
                        onChange={(value) => updateLine(line.productId, 'unitCost', value)}
                      />
                      <span className="flex flex-col gap-1 text-right">
                        <span className="text-muted-foreground text-xs font-semibold">{t('form.lineTotal')}</span>
                        <span className="pt-1.5 font-bold tabular-nums">{lineTotal === null ? '—' : formatMoney(lineTotal)}</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="justify-self-end rounded-full sm:mt-5"
                        aria-label={t('form.remove', { name: line.name })}
                        onClick={() => setDraft((current) => ({ ...current, lines: current.lines.filter((l) => l.productId !== line.productId) }))}
                      >
                        <RiDeleteBinLine />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <Field data-invalid={errors.supplier ? true : undefined}>
                <FieldLabel htmlFor="purchase-supplier">{t('form.supplier')}</FieldLabel>
                <Select
                  value={draft.supplierId === null ? undefined : String(draft.supplierId)}
                  onValueChange={(value) => {
                    setDraft((current) => ({ ...current, supplierId: Number(value) }))
                    setErrors((current) => ({ ...current, supplier: undefined }))
                  }}
                >
                  <SelectTrigger id="purchase-supplier" className="w-full" aria-invalid={errors.supplier ? true : undefined}>
                    <SelectValue placeholder={t('form.supplierPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {supplierOptions.map((supplier) => (
                      <SelectItem key={supplier.id} value={String(supplier.id)}>
                        {supplier.tradeName || supplier.legalName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.supplier ? <FieldError>{errors.supplier}</FieldError> : null}
                {suppliers.length === 0 ? (
                  <Link to="/suppliers/new" className="text-xs underline">
                    {t('form.noSuppliers')}
                  </Link>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="purchase-notes">{t('form.notes')}</FieldLabel>
                <Textarea
                  id="purchase-notes"
                  maxLength={1000}
                  placeholder={t('form.notesPlaceholder')}
                  value={draft.notes}
                  onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                />
              </Field>
              <div className="flex items-baseline justify-between border-t pt-4">
                <span className="text-muted-foreground text-sm">{t('form.total')}</span>
                <span className="text-2xl font-extrabold tracking-[-0.01em] tabular-nums">{formatMoney(total)}</span>
              </div>
              <div className="flex flex-col gap-2">
                <Button type="button" loading={busy} onClick={() => void saveAndSend()}>
                  <RiSendPlaneLine data-icon="inline-start" />
                  {t('form.saveAndSend')}
                </Button>
                <Button type="button" variant="outline" disabled={busy || (order !== null && !dirty)} onClick={() => void saveDraft()}>
                  {t('form.saveDraft')}
                </Button>
                {order ? (
                  <>
                    <Button type="button" variant="outline" disabled={busy} onClick={() => void saveAndReceive()}>
                      <RiInboxUnarchiveLine data-icon="inline-start" />
                      {t('actions.receive')}
                    </Button>
                    <Button type="button" variant="ghost" className="text-destructive" onClick={() => setCancelling(true)}>
                      <RiCloseCircleLine data-icon="inline-start" />
                      {t('actions.cancel')}
                    </Button>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {order ? (
        <>
          <ReceiveDialog order={order} open={receiving} onOpenChange={setReceiving} />
          <CancelOrderDialog order={order} open={cancelling} onOpenChange={setCancelling} />
        </>
      ) : null}
      <UnsavedChangesDialog
        open={blocker.state === 'blocked'}
        onStay={() => {
          if (blocker.state === 'blocked') blocker.reset()
        }}
        onLeave={() => {
          if (blocker.state === 'blocked') blocker.proceed()
        }}
      />
    </>
  )
}

function NumberField({
  label,
  accessibleLabel,
  value,
  error,
  suffix,
  onChange,
}: {
  label: string
  accessibleLabel: string
  value: string
  error: string | undefined
  suffix?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 text-xs font-semibold">
      <span aria-hidden="true" className="text-muted-foreground">
        {label}
        {suffix ? ` (${suffix})` : ''}
      </span>
      <Input
        inputMode="decimal"
        aria-label={accessibleLabel}
        aria-invalid={error ? true : undefined}
        className="h-9"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <span className="text-destructive font-normal">{error}</span> : null}
    </div>
  )
}

function CancelOrderDialog({ order, open, onOpenChange }: { order: PurchaseOrder; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('purchases')
  const { t: tc } = useTranslation()
  const cancel = useCancelPurchaseOrder()
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('cancel.title', { number: order.number })}</AlertDialogTitle>
          <AlertDialogDescription>{t('cancel.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel.keep')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              void cancel
                .mutateAsync(order.id)
                .then(() => toast.success(t('cancel.done', { number: order.number })))
                .catch(() => toast.error(tc('errors.unexpected')))
            }
          >
            {t('cancel.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Sent, received or cancelled orders (and drafts for those who only receive): read-only, with what can still be done. */
function OrderView({ order }: { order: PurchaseOrder }) {
  const { t, i18n } = useTranslation('purchases')
  const { formatMoney } = useCurrency()
  const format = useFormatQuantity()
  const canWrite = useCan('purchases.write')
  const { data: store } = useStore()
  const [receiving, setReceiving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const date = useMemo(() => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }), [i18n.language])
  const open = order.status === 'DRAFT' || order.status === 'ORDERED'
  const received = order.status === 'RECEIVED'

  function copyText() {
    const lines = [
      t('copy.title', { number: order.number, store: store?.name ?? '' }).trim(),
      t('copy.supplier', { supplier: order.supplierName }),
      '',
      ...order.items.map((item) => `• ${format(item.quantity, item.unitOfMeasure)} — ${item.name} (${item.sku})`),
      ...(order.notes ? ['', t('copy.notes', { notes: order.notes })] : []),
    ]
    void navigator.clipboard
      .writeText(lines.join('\n'))
      .then(() => toast.success(t('copy.done')))
      .catch(() => toast.error(t('copy.failed')))
  }

  const timeline = [
    { label: t('view.created'), at: order.createdAt, by: order.createdByName },
    { label: t('view.ordered'), at: order.orderedAt, by: null },
    { label: t('view.received'), at: order.receivedAt, by: order.receivedByName },
    { label: t('view.cancelled'), at: order.cancelledAt, by: null },
  ].filter((step) => step.at !== null)

  return (
    <>
      <PageHeader title={t('number', { number: order.number })} description={order.supplierName} actions={<PurchaseStatusPill status={order.status} />} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>{t('form.items', { count: order.items.length })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[30rem] text-sm tabular-nums">
                <thead>
                  <tr className="text-muted-foreground text-left text-xs">
                    <th className="pb-2 font-medium">{t('view.product')}</th>
                    <th className="pb-2 pl-3 text-right font-medium">{t('form.quantity')}</th>
                    <th className="pb-2 pl-3 text-right font-medium">{t('form.unitCost')}</th>
                    {received ? <th className="pb-2 pl-3 text-right font-medium">{t('view.arrived')}</th> : null}
                    <th className="pb-2 pl-3 text-right font-medium">{t('form.lineTotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => {
                    const short = received && item.receivedQuantity !== null && item.receivedQuantity < item.quantity
                    const costChanged = received && item.receivedUnitCost !== null && item.receivedUnitCost !== item.unitCost
                    return (
                      <tr key={item.id} className="border-t">
                        <td className="py-2.5">
                          {item.productId === null ? (
                            <span className="font-semibold">{item.name}</span>
                          ) : (
                            <Link to={`/products/${item.productId}/edit`} className="font-semibold hover:underline">
                              {item.name}
                            </Link>
                          )}
                          <span className="text-muted-foreground block text-xs">{item.sku}</span>
                        </td>
                        <td className="py-2.5 pl-3 text-right whitespace-nowrap">{format(item.quantity, item.unitOfMeasure)}</td>
                        <td className="py-2.5 pl-3 text-right whitespace-nowrap">{formatMoney(item.unitCost)}</td>
                        {received ? (
                          <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                            <span className={cn(short && 'text-warning-foreground font-semibold')}>
                              {format(item.receivedQuantity ?? 0, item.unitOfMeasure)}
                            </span>
                            <span className={cn('text-muted-foreground block text-xs', costChanged && 'text-warning-foreground font-semibold')}>
                              {formatMoney(item.receivedUnitCost ?? item.unitCost)}
                            </span>
                          </td>
                        ) : null}
                        <td className="py-2.5 pl-3 text-right font-semibold whitespace-nowrap">
                          {formatMoney(received ? (item.receivedQuantity ?? 0) * (item.receivedUnitCost ?? 0) : item.total)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-24">
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground text-sm">{received ? t('view.receivedTotal') : t('form.total')}</span>
              <span className="text-2xl font-extrabold tracking-[-0.01em] tabular-nums">{formatMoney(order.receivedTotal ?? order.total)}</span>
            </div>
            {received && order.receivedTotal !== null && order.receivedTotal !== order.total ? (
              <p className="text-muted-foreground -mt-3 text-xs">{t('view.orderedTotal', { value: formatMoney(order.total) })}</p>
            ) : null}
            <ol className="flex flex-col gap-2 border-t pt-4 text-sm">
              {timeline.map((step) => (
                <li key={step.label} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{step.label}</span>
                  <span className="text-right">
                    {date.format(new Date(step.at as string))}
                    {step.by ? <span className="text-muted-foreground block text-xs">{step.by}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
            {order.notes ? (
              <p className="bg-muted rounded-2xl p-3 text-sm whitespace-pre-line">{order.notes}</p>
            ) : null}
            <div className="flex flex-col gap-2">
              {open ? (
                <Button type="button" onClick={() => setReceiving(true)}>
                  <RiInboxUnarchiveLine data-icon="inline-start" />
                  {t('actions.receive')}
                </Button>
              ) : null}
              {order.status !== 'CANCELLED' ? (
                <Button type="button" variant="outline" onClick={copyText}>
                  <RiClipboardLine data-icon="inline-start" />
                  {t('actions.copy')}
                </Button>
              ) : null}
              {open && canWrite ? (
                <Button type="button" variant="ghost" className="text-destructive" onClick={() => setCancelling(true)}>
                  <RiCloseCircleLine data-icon="inline-start" />
                  {t('actions.cancel')}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
      <ReceiveDialog order={order} open={receiving} onOpenChange={setReceiving} />
      <CancelOrderDialog order={order} open={cancelling} onOpenChange={setCancelling} />
    </>
  )
}
