import { RiCheckLine, RiFileCopyLine, RiLinkM, RiMailSendLine } from '@remixicon/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ROLES, type Role } from '@/app/auth/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { isApiError } from '@/shared/api/http'
import { inviteLink, useCreateInvite, useInvites, useRevokeInvite } from '../invites'

const DEFAULT_ROLE: Role = 'CASHIER'

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
  const { t } = useTranslation('users')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('invites.title')}</DialogTitle>
          <DialogDescription>{t('invites.description')}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open: a new link is never shown again after closing. */}
        {open ? <InvitePanel /> : null}
      </DialogContent>
    </Dialog>
  )
}

function useErrorToast() {
  const { t: tc } = useTranslation()
  // A 403 already got the global permission toast.
  return (error: unknown) => {
    if (!(isApiError(error) && error.status === 403)) toast.error(tc('errors.unexpected'))
  }
}

function InvitePanel() {
  const { t, i18n } = useTranslation('users')
  const { t: tc } = useTranslation()
  const [role, setRole] = useState<Role>(DEFAULT_ROLE)
  const [link, setLink] = useState<{ url: string; role: Role } | null>(null)
  const [copied, setCopied] = useState(false)
  const showError = useErrorToast()
  const { data: invites, isPending, isError, refetch } = useInvites(true)
  const { mutateAsync: create, isPending: creating } = useCreateInvite()
  const { mutateAsync: revoke } = useRevokeInvite()
  const date = useMemo(() => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }), [i18n.language])

  async function generate() {
    try {
      const created = await create(role)
      setLink({ url: inviteLink(created.token), role })
      setCopied(false)
    } catch (error) {
      showError(error)
    }
  }

  async function copy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link.url)
      setCopied(true)
      toast.success(t('invites.copied'))
    } catch {
      // Clipboard blocked: the field is selectable, so the link can still be copied by hand.
      toast.error(t('invites.copyFailed'))
    }
  }

  async function revokeOne(id: number) {
    try {
      await revoke(id)
      toast.success(t('invites.revoked'))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="new-invite-title" className="flex flex-col gap-3">
        <h3 id="new-invite-title" className="text-sm font-semibold">
          {t('invites.newTitle')}
        </h3>
        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
          <legend className="sr-only">{t('invites.role')}</legend>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((value) => (
              <label
                key={value}
                className="border-input has-checked:border-foreground has-checked:bg-foreground has-checked:text-background has-focus-visible:ring-ring/50 cursor-pointer rounded-full border-2 px-4 py-1.5 text-[13px] font-semibold transition-colors duration-200 has-focus-visible:ring-3"
              >
                <input
                  type="radio"
                  name="invite-role"
                  value={value}
                  checked={role === value}
                  onChange={() => setRole(value)}
                  className="sr-only"
                />
                {tc(`roles.${value}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="text-muted-foreground text-xs">{t(`invites.roleHint.${role}`)}</p>
        <Button onClick={() => void generate()} loading={creating} className="self-start">
          <RiLinkM data-icon="inline-start" aria-hidden="true" />
          {t('invites.generate')}
        </Button>
        {link ? (
          <div className="bg-accent flex flex-col gap-2.5 rounded-2xl p-4">
            <label htmlFor="invite-link" className="text-accent-foreground text-xs font-semibold">
              {t('invites.linkFor', { role: tc(`roles.${link.role}`) })}
            </label>
            <div className="flex gap-2">
              <Input
                id="invite-link"
                readOnly
                value={link.url}
                onFocus={(event) => event.currentTarget.select()}
                className="bg-card min-w-0 flex-1 font-mono text-xs"
              />
              <Button type="button" variant="outline" onClick={() => void copy()}>
                {copied ? <RiCheckLine data-icon="inline-start" aria-hidden="true" /> : <RiFileCopyLine data-icon="inline-start" aria-hidden="true" />}
                {copied ? t('invites.copiedShort') : t('invites.copy')}
              </Button>
            </div>
            <p className="text-accent-foreground text-xs text-pretty">{t('invites.linkNote')}</p>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="pending-invites-title" className="flex flex-col gap-3">
        <h3 id="pending-invites-title" className="text-sm font-semibold">
          {t('invites.pendingTitle')}
        </h3>
        {isError ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{t('invites.loadError')}</span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              {tc('actions.tryAgain')}
            </Button>
          </div>
        ) : isPending ? (
          <Skeleton className="h-14 rounded-xl" />
        ) : invites.length === 0 ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <RiMailSendLine className="size-4" aria-hidden="true" />
            {t('invites.none')}
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center gap-3 px-3.5 py-3">
                <Badge variant="secondary" className="shrink-0">
                  {tc(`roles.${invite.role}`)}
                </Badge>
                <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                  {t('invites.meta', {
                    name: invite.createdByName,
                    date: date.format(new Date(invite.expiresAt)),
                  })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void revokeOne(invite.id)}
                  aria-label={t('invites.revokeLabel', { role: tc(`roles.${invite.role}`), name: invite.createdByName })}
                >
                  {t('invites.revoke')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
