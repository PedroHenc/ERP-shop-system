import { request } from '@/shared/api/http'
import type { Product, ProductListParams, ProductPage, ProductRequest } from './types'

export function fetchProductsPage(params: ProductListParams, signal?: AbortSignal): Promise<ProductPage> {
  return request<ProductPage>('/products', { query: { ...params }, signal })
}

export function fetchProduct(id: number, signal?: AbortSignal): Promise<Product> {
  return request<Product>(`/products/${id}`, { signal })
}

export function createProduct(body: ProductRequest): Promise<Product> {
  return request<Product>('/products', { method: 'POST', body })
}

export function updateProduct(id: number, body: ProductRequest): Promise<Product> {
  return request<Product>(`/products/${id}`, { method: 'PUT', body })
}

export function deleteProduct(id: number): Promise<void> {
  return request<void>(`/products/${id}`, { method: 'DELETE' })
}
