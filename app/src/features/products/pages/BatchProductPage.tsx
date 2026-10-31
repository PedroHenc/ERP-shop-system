import { RiAddLine, RiCameraLine, RiCloseLine, RiSmartphoneLine } from '@remixicon/react'
import type { ParseKeys } from 'i18next'
import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useBlocker, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useCurrencySymbol } from '@/features/products/components/ProductFormSections'
import { useCreateProducts } from '@/features/products/queries'
import { productFormDefaults, productFormSchema, toProductRequest } from '@/features/products/schema'
import type { Product, ProductRequest } from '@/features/products/types'
import { findProductByBarcode } from '@/features/scan/api'
import { CameraScanDialog } from '@/features/scan/components/CameraScanDialog'
import { PairPhonePanel } from '@/features/scan/components/PairPhonePanel'
import { canUseCamera } from '@/features/scan/detector'
import { cn } from '@/lib/utils'
import { isApiError } from '@/shared/api/http'
import { PageHeader } from '@/shared/components/PageHeader'
import { UnsavedChangesDialog } from '@/shared/components/UnsavedChangesDialog'

const FIELDS = ['barcode', 'sku', 'name', 'category', 'price', 'costPrice', 'stockQuantity'] as const
type RowField = (typeof FIELDS)[number]
type Row = Record<RowField, string> & { key: number; errors: Partial<Record<RowField, string>> }

/** Matches the API's limit for one batch. */
const MAX_ROWS = 100
const VALIDATION_PREFIX = 'products:validation.'
const REQUIRED: ReadonlySet<RowField> = new Set(['sku', 'name', 'category', 'price'])

let nextKey = 1

function newRow(barcode = '', category = ''): Row {
  // The barcode doubles as a SKU until someone types another one: one less field per product.
  return { key: nextKey++, barcode, sku: barcode, name: '', category, price: '', costPrice: '', stockQuantity: '0', errors: {} }
}

function isRowField(name: string): name is RowField {
  return (FIELDS as readonly string[]).includes(name)
}

/**
 * Several new products at once: barcodes read by a phone (or this device's camera) become rows with the
 * code filled in; typing the rest and "Save all" creates them together, or none if a row is wrong. Codes
 * already in the catalogue are listed apart instead of becoming rows.
 */
export function BatchProductPage() {
  const { t } = useTranslation('products')
  const { t: tc } = useTranslation()
  const navigate = useNavigate()
  const symbol = useCurrencySymbol()
  const create = useCreateProducts()
  const [rows, setRows] = useState<Row[]>([])
  const [existing, setExisting] = useState<Product[]>([])
  const [flashKey, setFlashKey] = useState<number | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  // Every code received, rows removed since included: the phone's list is resent on each poll.
  const received = useRef(new Set<string>())
  const saved = useRef(false)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => rows.length > 0 && !saved.current && currentLocation.pathname !== nextLocation.pathname,
  )

  function addCode(code: string) {
    if (received.current.has(code)) {
      // Read again: point at its row.
      const row = rows.find((r) => r.barcode === code)
      if (row) setFlashKey(row.key)
      return
    }
    received.current.add(code)
    // Made here, not in the updater: React may run an updater twice, and the key must be this row's.
    const row = newRow(code)
    setRows((current) =>
      current.length >= MAX_ROWS ? current : [...current, { ...row, category: current.at(-1)?.category ?? '' }],
    )
    void findProductByBarcode(code)
      .then((product) => {
        if (!product) return
        setRows((current) => current.filter((r) => r.key !== row.key))
        setExisting((list) => [...list, product])
      })
      .catch(() => undefined)
  }

  function addCodes(codes: string[]) {
    for (const code of codes) if (!received.current.has(code)) addCode(code)
  }

  function update(key: number, field: RowField, value: string) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value, errors: { ...row.errors, [field]: undefined } } : row)),
    )
  }

  function remove(key: number) {
    setRows((current) => current.filter((row) => row.key !== key))
  }

  function errorText(message: string | undefined): string | undefined {
    return message?.startsWith(VALIDATION_PREFIX) ? t(message.slice('products:'.length) as ParseKeys<'products'>) : message
  }

  async function saveAll() {
    let valid = true
    const requests: ProductRequest[] = []
    const checked = rows.map((row) => {
      const result = productFormSchema.safeParse({ ...productFormDefaults, ...pick(row) })
      if (result.success) {
        requests.push(toProductRequest(result.data, null))
        return { ...row, errors: {} }
      }
      valid = false
      const errors: Row['errors'] = {}
      for (const issue of result.error.issues) {
        const field = String(issue.path[0])
        if (isRowField(field)) errors[field] ??= issue.message
      }
      return { ...row, errors }
    })
    setRows(checked)
    if (!valid) {
      toast.error(t('batch.fixRows'))
      return
    }
    try {
      const created = await create.mutateAsync(requests)
      saved.current = true
      toast.success(t('batch.saved', { count: created.length }))
      void navigate('/products')
    } catch (error) {
      if (!(isApiError(error) && error.status === 400 && error.errors)) {
        if (!(isApiError(error) && error.status === 403)) toast.error(tc('errors.unexpected'))
        return
      }
      const serverErrors = error.errors
      setRows((current) =>
        current.map((row, index) => {
          const errors: Row['errors'] = {}
          for (const [name, message] of Object.entries(serverErrors)) {
            const match = /^products\[(\d+)]\.(\w+)$/.exec(name)
            if (match && Number(match[1]) === index && isRowField(match[2])) errors[match[2]] = message
          }
          return Object.keys(errors).length > 0 ? { ...row, errors } : row
        }),
      )
      toast.error(t('batch.fixRows'))
    }
  }

  const count = rows.length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('batch.title')} description={t('batch.description')} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>{t('batch.rowsTitle', { count })}</CardTitle>
            <CardDescription>{t('batch.rowsHelp')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {count > 0 ? (
              <div
                aria-hidden="true"
                className="text-muted-foreground hidden gap-2 px-1 text-xs font-semibold xl:grid xl:grid-cols-[9rem_8rem_minmax(0,1fr)_7.5rem_6rem_6rem_4.5rem_2.25rem]"
              >
                <span>{t('form.fields.barcode')}</span>
                <span>{t('form.fields.sku')} *</span>
                <span>{t('form.fields.name')} *</span>
                <span>{t('form.fields.category')} *</span>
                <span>
                  {t('form.fields.price')} * ({symbol})
                </span>
                <span>
                  {t('batch.cost')} ({symbol})
                </span>
                <span>{t('batch.stock')}</span>
              </div>
            ) : null}
            <ul className="flex flex-col gap-3 xl:gap-2">
              <AnimatePresence initial={false}>
                {rows.map((row, index) => (
                  <motion.li
                    key={row.key}
                    layout
                    initial={{ opacity: 0, y: -12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.4 }}
                    onAnimationComplete={() => flashKey === row.key && setFlashKey(null)}
                    className={cn(
                      'grid grid-cols-2 gap-2 rounded-2xl p-3 transition-colors duration-500 xl:grid-cols-[9rem_8rem_minmax(0,1fr)_7.5rem_6rem_6rem_4.5rem_2.25rem] xl:items-start xl:rounded-xl xl:p-1',
                      flashKey === row.key ? 'bg-primary/15' : 'bg-muted/50 xl:bg-transparent',
                    )}
                  >
                    {FIELDS.map((field) => (
                      <RowInput
                        key={field}
                        row={row}
                        field={field}
                        label={`${t(field === 'stockQuantity' ? 'batch.stock' : field === 'costPrice' ? 'batch.cost' : `form.fields.${field}`)} · ${index + 1}`}
                        shortLabel={`${t(field === 'stockQuantity' ? 'batch.stock' : field === 'costPrice' ? 'batch.cost' : `form.fields.${field}`)}${REQUIRED.has(field) ? ' *' : ''}`}
                        error={errorText(row.errors[field])}
                        onChange={(value) => update(row.key, field, value)}
                      />
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="col-span-2 justify-self-end rounded-full xl:col-span-1"
                      aria-label={t('batch.removeRow', { row: index + 1 })}
                      onClick={() => remove(row.key)}
                    >
                      <RiCloseLine />
                    </Button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            {count === 0 ? (
              <p className="text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm text-pretty">
                {t('batch.empty')}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={count >= MAX_ROWS}
                onClick={() => setRows((current) => [...current, newRow('', current.at(-1)?.category ?? '')])}
              >
                <RiAddLine data-icon="inline-start" />
                {t('batch.addRow')}
              </Button>
              {canUseCamera() ? (
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setCameraOpen(true)}>
                  <RiCameraLine data-icon="inline-start" />
                  {t('batch.useCamera')}
                </Button>
              ) : null}
              <span className="flex-1" />
              <Button variant="ghost" asChild>
                <Link to="/products">{tc('actions.cancel')}</Link>
              </Button>
              <Button type="button" loading={create.isPending} disabled={count === 0} onClick={() => void saveAll()}>
                {create.isPending ? tc('actions.saving') : t('batch.saveAll', { count })}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RiSmartphoneLine className="size-5" aria-hidden="true" />
                {t('batch.phoneTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PairPhonePanel batch onCodes={addCodes} />
            </CardContent>
          </Card>
          {existing.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('batch.existingTitle', { count: existing.length })}</CardTitle>
                <CardDescription>{t('batch.existingHelp')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {existing.map((product) => (
                    <li key={product.id} className="bg-muted flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5">
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-semibold">{product.name}</span>
                        <span className="text-muted-foreground font-mono text-xs">{product.barcode}</span>
                      </span>
                      <Button asChild variant="ghost" size="sm" className="shrink-0 rounded-full">
                        <Link to={`/products/${product.id}/edit`} target="_blank" rel="noreferrer">
                          {t('batch.open')}
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <CameraScanDialog open={cameraOpen} onOpenChange={setCameraOpen} onDetected={addCode} continuous />
      <UnsavedChangesDialog
        open={blocker.state === 'blocked'}
        onStay={() => {
          if (blocker.state === 'blocked') blocker.reset()
        }}
        onLeave={() => {
          if (blocker.state === 'blocked') blocker.proceed()
        }}
      />
    </div>
  )
}

function pick(row: Row): Record<RowField, string> {
  return {
    barcode: row.barcode,
    sku: row.sku,
    name: row.name,
    category: row.category,
    price: row.price,
    costPrice: row.costPrice,
    stockQuantity: row.stockQuantity,
  }
}

function RowInput({
  row,
  field,
  label,
  shortLabel,
  error,
  onChange,
}: {
  row: Row
  field: RowField
  label: string
  shortLabel: string
  error: string | undefined
  onChange: (value: string) => void
}) {
  const id = `batch-${row.key}-${field}`
  const wide = field === 'name'
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', wide && 'col-span-2 xl:col-span-1')}>
      <label htmlFor={id} className="text-muted-foreground text-xs font-semibold xl:sr-only">
        {shortLabel}
      </label>
      <Input
        id={id}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        inputMode={field === 'barcode' ? 'numeric' : field === 'name' || field === 'category' || field === 'sku' ? undefined : 'decimal'}
        className={cn('h-9', (field === 'barcode' || field === 'sku') && 'font-mono text-xs')}
        value={row[field]}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p id={`${id}-error`} className="text-destructive text-xs">
          {error}
        </p>
      ) : null}
    </div>
  )
}
