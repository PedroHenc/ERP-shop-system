export interface Store {
  id: number
  name: string
  /** A data URL (PNG, JPEG or WebP), or null for the default icon. */
  logo: string | null
}

export interface StoreRequest {
  name: string
  logo: string | null
}
