import { useMutation, useQueryClient } from '@tanstack/react-query'
import { dashboardKeys } from '@/features/dashboard/queries'
import { productKeys } from '@/features/products/queries'
import { reportKeys } from '@/features/reports/queries'
import { stockKeys } from '@/features/stock/queries'
import { createSale } from './api'
import type { SaleRequest } from './types'

export const saleKeys = {
  all: ['sales'] as const,
}

/** A sale takes stock out: refresh everything that shows stock. */
export function useCreateSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SaleRequest) => createSale(body),
    onSuccess: () =>
      Promise.all(
        [saleKeys.all, productKeys.all, stockKeys.all, dashboardKeys.all, reportKeys.all].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  })
}
