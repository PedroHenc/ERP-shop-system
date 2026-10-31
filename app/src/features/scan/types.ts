export interface ScanSessionCreated {
  id: number
  /** Goes into the QR code; returned only once. */
  token: string
  expiresAt: string
}

export interface ScanSession {
  id: number
  status: 'WAITING' | 'SCANNED' | 'EXPIRED'
  /** Several new products: the phone keeps sending codes, collected in `codes`. */
  batch: boolean
  code: string | null
  codes: string[]
  expiresAt: string
}

export interface ScanPreview {
  storeName: string
  expiresAt: string
  batch: boolean
  /** Codes the session already has (a batch reopened on the phone). */
  total: number
}

export interface ScanSubmitResult {
  total: number
  /** Already in this batch: not added again. */
  duplicate: boolean
}
