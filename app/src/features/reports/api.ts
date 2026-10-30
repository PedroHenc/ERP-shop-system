import { request } from '@/shared/api/http'
import type { StockReport, StockReportQuery } from './types'

export function fetchStockReport(query: StockReportQuery, signal?: AbortSignal): Promise<StockReport> {
  return request<StockReport>('/reports/stock', { query: { ...query }, signal })
}
