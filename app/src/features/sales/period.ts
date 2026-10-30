/** The periods of the sales list: today by default. */
export const SALE_PERIODS = ['today', '7d', '30d', '90d'] as const
export type SalePeriod = (typeof SALE_PERIODS)[number]

const DAYS: Record<SalePeriod, number> = { today: 1, '7d': 7, '30d': 30, '90d': 90 }

export function toSalePeriod(value: string | undefined | null): SalePeriod {
  return (SALE_PERIODS as readonly string[]).includes(value ?? '') ? (value as SalePeriod) : 'today'
}

/** The last N local days, today included: from N−1 midnights ago to the next midnight. */
export function saleRange(period: SalePeriod, now = new Date()): { from: string; to: string } {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (DAYS[period] - 1))
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return { from: from.toISOString(), to: to.toISOString() }
}
