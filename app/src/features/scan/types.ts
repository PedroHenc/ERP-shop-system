export interface ScanSessionCreated {
  id: number
  /** Goes into the QR code; returned only once. */
  token: string
  expiresAt: string
}

export interface ScanSession {
  id: number
  status: 'WAITING' | 'SCANNED' | 'EXPIRED'
  code: string | null
  expiresAt: string
}

export interface ScanPreview {
  storeName: string
  expiresAt: string
}
