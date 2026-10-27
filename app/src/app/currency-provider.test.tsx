import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import i18n from '@/app/i18n'
import { CURRENCY_STORAGE_KEY } from './currencies'
import { CurrencyProvider, useCurrency } from './currency-provider'

function Probe({ value }: { value: number | string }) {
  const { currency, setCurrency, formatMoney } = useCurrency()
  return (
    <div>
      <span data-testid="currency">{currency}</span>
      <span data-testid="money">{formatMoney(value)}</span>
      <button type="button" onClick={() => setCurrency('JPY')}>jpy</button>
      <button type="button" onClick={() => setCurrency('EUR')}>eur</button>
    </div>
  )
}

function renderProbe(value: number | string = 1234.5) {
  return render(
    <CurrencyProvider>
      <Probe value={value} />
    </CurrencyProvider>,
  )
}

describe('CurrencyProvider', () => {
  it('formats USD by default', () => {
    renderProbe(1234.5)
    expect(screen.getByTestId('money')).toHaveTextContent('$1,234.50')
  })

  it('accepts numeric strings', () => {
    renderProbe('12.5')
    expect(screen.getByTestId('money')).toHaveTextContent('$12.50')
  })

  it('formats JPY without hiding stored cents', () => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, 'JPY')
    const { unmount } = renderProbe(10)
    expect(screen.getByTestId('money')).toHaveTextContent(/^¥10$/)
    unmount()
    renderProbe(9.99)
    expect(screen.getByTestId('money')).toHaveTextContent(/^¥9\.99$/)
  })

  it('falls back to USD when stored currency is invalid', () => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, 'XYZ')
    renderProbe()
    expect(screen.getByTestId('currency')).toHaveTextContent('USD')
  })

  it('persists the selected currency', () => {
    renderProbe()
    act(() => screen.getByText('eur').click())
    expect(screen.getByTestId('currency')).toHaveTextContent('EUR')
    expect(localStorage.getItem(CURRENCY_STORAGE_KEY)).toBe('EUR')
  })

  it('re-formats when the language changes', async () => {
    renderProbe(1234.5)
    await act(() => i18n.changeLanguage('pt-BR'))
    expect(screen.getByTestId('money').textContent).toBe('US$\u00a01.234,50')
  })
})
