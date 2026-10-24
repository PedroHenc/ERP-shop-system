export interface RestockItem {
  id: number
  sku: string
  name: string
  stockQuantity: number
  minimumStock: number
}

export interface DashboardSummary {
  activeProducts: number
  lowStock: number
  outOfStock: number
  inventoryValue: number
  activeBrands: number
  /** `null` when the user lacks `suppliers.read`. */
  activeSuppliers: number | null
  restock: RestockItem[]
}
