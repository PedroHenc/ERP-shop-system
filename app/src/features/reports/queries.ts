import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchStockReport } from './api'
import type { StockReportQuery } from './types'

export const reportKeys = {
  all: ['reports'] as const,
  stock: (query: StockReportQuery) => [...reportKeys.all, 'stock', query] as const,
}

export function useStockReport(query: StockReportQuery) {
  return useQuery({
    queryKey: reportKeys.stock(query),
    queryFn: ({ signal }) => fetchStockReport(query, signal),
    // A new period keeps the previous report on screen, dimmed, instead of a skeleton.
    placeholderData: keepPreviousData,
  })
}
