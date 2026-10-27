import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'

const VALIDATION_PREFIX = 'users:validation.'

/** Client-side messages are i18n keys (see schema.ts); server messages are already text. */
export function useUserErrorText() {
  const { t } = useTranslation('users')
  return (message: string | undefined) =>
    message?.startsWith(VALIDATION_PREFIX) ? t(message.slice('users:'.length) as ParseKeys<'users'>) : message
}
