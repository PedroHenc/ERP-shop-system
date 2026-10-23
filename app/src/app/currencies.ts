export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'BRL',
  'JPY',
  'GBP',
  'CNY',
  'CAD',
  'AUD',
  'CHF',
  'MXN',
] as const

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]
export const DEFAULT_CURRENCY: CurrencyCode = 'USD'
export const CURRENCY_STORAGE_KEY = 'erp.currency'

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return SUPPORTED_CURRENCIES.some((code) => code === value)
}
