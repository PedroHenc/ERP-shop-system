export interface Brand {
  id: number
  name: string
}

export interface BrandDetail {
  id: number
  version: number
  name: string
  active: boolean
  createdDate: string
  lastModifiedDate: string
}

export interface BrandRequest {
  name: string
  active: boolean
  version: number | null
}

export interface BrandPage {
  content: BrandDetail[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export type { BrandListParams, BrandSortField } from './list-params'
