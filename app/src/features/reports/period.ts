import type { StockReportQuery } from './types'

export const REPORT_PERIODS = ['7d', '30d', '90d', '365d'] as const
export type ReportPeriod = (typeof REPORT_PERIODS)[number]
export const DEFAULT_PERIOD: ReportPeriod = '30d'

const DAYS: Record<ReportPeriod, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }

export function toReportPeriod(value: string | null): ReportPeriod {
  return (REPORT_PERIODS as readonly string[]).includes(value ?? '') ? (value as ReportPeriod) : DEFAULT_PERIOD
}

/** The last N local days, today included: from N−1 midnights ago to the next midnight. */
export function reportQuery(period: ReportPeriod, now = new Date()): StockReportQuery {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (DAYS[period] - 1))
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return { from: from.toISOString(), to: to.toISOString(), zone: Intl.DateTimeFormat().resolvedOptions().timeZone }
}

export interface FlowPoint {
  /** First day of the bucket, YYYY-MM-DD. */
  start: string
  /** Last day of the bucket (the same day for daily buckets). */
  end: string
  valueIn: number
  valueOut: number
}

/** Daily points, or weekly sums past 92 days, so columns never get thinner than a few pixels. */
export function toFlowPoints(daily: { date: string; valueIn: number; valueOut: number }[]): FlowPoint[] {
  if (daily.length <= 92) return daily.map((d) => ({ start: d.date, end: d.date, valueIn: d.valueIn, valueOut: d.valueOut }))
  const points: FlowPoint[] = []
  for (let i = 0; i < daily.length; i += 7) {
    const week = daily.slice(i, i + 7)
    points.push({
      start: week[0].date,
      end: week[week.length - 1].date,
      valueIn: week.reduce((sum, d) => sum + d.valueIn, 0),
      valueOut: week.reduce((sum, d) => sum + d.valueOut, 0),
    })
  }
  return points
}

/** A round axis maximum: 1, 2, 2.5 or 5 × a power of ten, at or above `value`. */
export function niceMax(value: number): number {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * power >= value) return step * power
  }
  return 10 * power
}

/** "2026-10-30" as a local date (not UTC midnight, which shifts the day west of Greenwich). */
export function parseDay(day: string): Date {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year, month - 1, date)
}
