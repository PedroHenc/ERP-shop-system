import { request } from '@/shared/api/http'
import type { SalesReport, StockReport, StockReportQuery } from './types'

export function fetchStockReport(query: StockReportQuery, signal?: AbortSignal): Promise<StockReport> {
  return request<StockReport>('/reports/stock', { query: { ...query }, signal })
}

export function fetchSalesReport(query: StockReportQuery, signal?: AbortSignal): Promise<SalesReport> {
  return request<SalesReport>('/reports/sales', { query: { ...query }, signal })
}
