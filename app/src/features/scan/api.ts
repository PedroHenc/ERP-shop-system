import { request } from '@/shared/api/http'
import type { Product } from '@/features/products/types'
import type { ScanPreview, ScanSession, ScanSessionCreated, ScanSubmitResult } from './types'

export function createScanSession(batch = false): Promise<ScanSessionCreated> {
  return request<ScanSessionCreated>('/scan-sessions', { method: 'POST', body: { batch } })
}

/** Ends a batch session: the phone's next code is refused. */
export function closeScanSession(id: number): Promise<void> {
  return request<void>(`/scan-sessions/${id}/close`, { method: 'POST' })
}

export function fetchScanSession(id: number, signal?: AbortSignal): Promise<ScanSession> {
  return request<ScanSession>(`/scan-sessions/${id}`, { signal })
}

/** Public (the phone is not signed in): the token is the credential. */
export function previewScan(token: string): Promise<ScanPreview> {
  return request<ScanPreview>('/scan/preview', { method: 'POST', body: { token } })
}

export function submitScan(token: string, code: string): Promise<ScanSubmitResult> {
  return request<ScanSubmitResult>('/scan/submit', { method: 'POST', body: { token, code } })
}

/** The product (active or not) already using this barcode, if any. */
export async function findProductByBarcode(code: string): Promise<Product | null> {
  const page = await request<{ content: Product[] }>('/products/page', {
    query: { search: code, page: 0, size: 20, sortBy: 'name', direction: 'ASC' },
  })
  return page.content.find((product) => product.barcode === code) ?? null
}
