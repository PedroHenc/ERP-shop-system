import { useTranslation } from 'react-i18next'
import { Pill, type PillTone } from '@/shared/components/Pill'
import type { PurchaseStatus } from '../types'

const TONES: Record<PurchaseStatus, PillTone> = { DRAFT: 'neutral', ORDERED: 'warning', RECEIVED: 'ok', CANCELLED: 'danger' }

export function PurchaseStatusPill({ status }: { status: PurchaseStatus }) {
  const { t } = useTranslation('purchases')
  return <Pill tone={TONES[status]}>{t(`status.${status}`)}</Pill>
}
