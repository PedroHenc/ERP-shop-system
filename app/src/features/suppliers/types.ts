export interface Supplier {
  id: number
  version: number
  legalName: string
  tradeName: string | null
  taxId: string | null
  email: string | null
  phone: string | null
  active: boolean
  createdDate: string
  lastModifiedDate: string
}

export interface SupplierRequest {
  legalName: string
  tradeName: string | null
  taxId: string | null
  email: string | null
  phone: string | null
  active: boolean
  version: number | null
}

export interface SupplierPage {
  content: Supplier[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export type { SupplierListParams, SupplierSortField } from './list-params'
