import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { UnitOfMeasure } from '@/features/products/types'

/** "12,5 kg": the quantity in the current language (up to 3 decimals) with the unit's short label. */
export function useFormatQuantity() {
  const { t, i18n } = useTranslation('products')
  return useMemo(() => {
    const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 3 })
    return (value: number, unit: UnitOfMeasure, options: { signed?: boolean } = {}) => {
      const text = number.format(Math.abs(value))
      const sign = options.signed ? (value > 0 ? '+' : value < 0 ? '−' : '') : value < 0 ? '−' : ''
      return `${sign}${text} ${t(`units.${unit}`)}`
    }
  }, [i18n.language, t])
}
