import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CURRENCY_STORAGE_KEY,
  DEFAULT_CURRENCY,
  isCurrencyCode,
  type CurrencyCode,
} from './currencies'

interface CurrencyContextValue {
  currency: CurrencyCode
  setCurrency(code: CurrencyCode): void
  formatMoney(value: number | string): string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

function readStoredCurrency(): CurrencyCode {
  try {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY)
    return isCurrencyCode(stored) ? stored : DEFAULT_CURRENCY
  } catch {
    return DEFAULT_CURRENCY
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const language = i18n.language
  const [currency, setCurrencyState] = useState<CurrencyCode>(readStoredCurrency)

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code)
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, code)
    } catch {
      // Storage unavailable (e.g. private mode): keep the choice in memory only.
    }
  }, [])

  const value = useMemo<CurrencyContextValue>(() => {
    // Display only: the currency's default minimum digits, up to 2 (the API precision),
    // so stored cents are never hidden.
    const formatter = new Intl.NumberFormat(language, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    })
    return {
      currency,
      setCurrency,
      formatMoney: (amount) => formatter.format(Number(amount)),
    }
  }, [currency, language, setCurrency])

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider')
  return ctx
}
