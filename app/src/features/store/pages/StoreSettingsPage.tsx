import { RiDeleteBinLine, RiImageAddLine } from '@remixicon/react'
import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { isApiError } from '@/shared/api/http'
import { PageHeader } from '@/shared/components/PageHeader'
import { FormSkeleton } from '@/shared/forms/FormSkeleton'
import { popSpring } from '@/shared/motion/presets'
import { StoreLogo } from '../components/StoreLogo'
import { toLogoDataUrl } from '../logo'
import { useStore, useUpdateStore } from '../queries'
import type { Store } from '../types'

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']
/** Larger files are refused before reading them: phone photos are well under this. */
const MAX_FILE_BYTES = 15 * 1024 * 1024
const NAME_MAX = 100

/** Admins: the store's name and logo, shown at the start of the top bar for everyone in the store. */
export function StoreSettingsPage() {
  const { t } = useTranslation('store')
  const { data: store, isPending, isError, refetch } = useStore()
  return (
    <div>
      <PageHeader title={t('title')} description={t('description')} />
      {isPending ? (
        <FormSkeleton />
      ) : isError || !store ? (
        <div className="flex max-w-xl flex-col items-start gap-3">
          <p role="alert" className="font-semibold">
            {t('loadError')}
          </p>
          <Button variant="outline" onClick={() => void refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : (
        <StoreForm store={store} />
      )}
    </div>
  )
}

function StoreForm({ store }: { store: Store }) {
  const { t } = useTranslation('store')
  const { t: tc } = useTranslation()
  const update = useUpdateStore()
  const [name, setName] = useState(store.name)
  const [logo, setLogo] = useState(store.logo)
  const [nameError, setNameError] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const dirty = name !== store.name || logo !== store.logo

  async function pick(file: File | undefined) {
    if (!file) return
    setLogoError(null)
    if (!ACCEPTED.includes(file.type)) return setLogoError(t('logo.wrongType'))
    if (file.size > MAX_FILE_BYTES) return setLogoError(t('logo.tooLarge'))
    setReading(true)
    try {
      setLogo(await toLogoDataUrl(file))
    } catch {
      setLogoError(t('logo.unreadable'))
    } finally {
      setReading(false)
    }
  }

  function drop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    void pick(event.dataTransfer.files[0])
  }

  async function save() {
    const trimmed = name.trim()
    if (trimmed === '') return setNameError(t('name.required'))
    setNameError(null)
    try {
      const saved = await update.mutateAsync({ name: trimmed, logo })
      setName(saved.name)
      toast.success(t('saved'))
    } catch (error) {
      const errors = isApiError(error) ? error.errors : undefined
      if (errors?.name) setNameError(errors.name)
      if (errors?.logo) setLogoError(errors.logo)
      if (!errors?.name && !errors?.logo) toast.error(tc('errors.unexpected'))
    }
  }

  return (
    <form
      noValidate
      className="flex max-w-2xl flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>{t('preview.title')}</CardTitle>
          <CardDescription>{t('preview.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* The top bar's brand, live: what everyone in the store will see. */}
          <div className="bg-background flex items-center gap-2.5 rounded-full p-2 pr-5" aria-hidden="true">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={logo ?? 'icon'}
                initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={popSpring}
              >
                <StoreLogo logo={logo} />
              </motion.span>
            </AnimatePresence>
            <span className="truncate text-[17px] font-extrabold tracking-[-0.01em]">{name.trim() || store.name}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('identity')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Field data-invalid={nameError ? true : undefined}>
            <FieldLabel htmlFor="store-name">{t('name.label')}</FieldLabel>
            <Input
              id="store-name"
              maxLength={NAME_MAX}
              autoComplete="organization"
              aria-invalid={nameError ? true : undefined}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {nameError ? <FieldError>{nameError}</FieldError> : null}
          </Field>

          <Field data-invalid={logoError ? true : undefined}>
            <FieldLabel htmlFor="store-logo">{t('logo.label')}</FieldLabel>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={drop}
                aria-describedby="store-logo-hint"
                className={cn(
                  'group/drop focus-visible:ring-ring/50 relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed outline-none transition-[border-color,background-color,transform] duration-200 focus-visible:ring-3 active:scale-95',
                  dragging ? 'border-primary bg-primary/10 scale-105' : 'border-input hover:border-primary/60 hover:bg-muted',
                )}
              >
                {logo ? <StoreLogo logo={logo} className="size-full" /> : null}
                <span
                  className={cn(
                    'flex flex-col items-center gap-1 text-xs font-semibold',
                    logo
                      ? 'absolute inset-0 justify-center bg-black/55 text-white opacity-0 transition-opacity group-hover/drop:opacity-100 group-focus-visible/drop:opacity-100'
                      : 'text-muted-foreground',
                  )}
                >
                  <RiImageAddLine className="size-6" aria-hidden="true" />
                  {reading ? t('logo.reading') : logo ? t('logo.change') : t('logo.choose')}
                </span>
              </button>
              <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                <FieldDescription id="store-logo-hint">{t('logo.hint')}</FieldDescription>
                {logo ? (
                  <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => setLogo(null)}>
                    <RiDeleteBinLine data-icon="inline-start" />
                    {t('logo.remove')}
                  </Button>
                ) : null}
              </div>
            </div>
            <input
              ref={fileInput}
              id="store-logo"
              type="file"
              accept={ACCEPTED.join(',')}
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                void pick(event.target.files?.[0])
                event.target.value = ''
              }}
            />
            {logoError ? <FieldError>{logoError}</FieldError> : null}
          </Field>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" loading={update.isPending} disabled={!dirty || reading}>
          {update.isPending ? tc('actions.saving') : tc('actions.save')}
        </Button>
        {dirty ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setName(store.name)
              setLogo(store.logo)
              setNameError(null)
              setLogoError(null)
            }}
          >
            {tc('actions.cancel')}
          </Button>
        ) : null}
      </div>
    </form>
  )
}
