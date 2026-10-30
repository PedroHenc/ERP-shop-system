/**
 * Barcode reading for the camera scanner. Browsers with a native BarcodeDetector (Chrome on Android)
 * use it; the others (Safari on iPhone, Firefox) load a ZXing WebAssembly reader on demand, served
 * from this app rather than a CDN. Both stay out of the main bundle until a scanner opens.
 */

/**
 * Product barcodes only. Code 39 and QR codes are left out: they never hold a GTIN, and Code 39 (like a
 * partly seen ITF) is prone to false reads from the bars of an EAN.
 */
export const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf', 'code_128'] as const

export interface DetectedBarcode {
  rawValue: string
  format: string
}

export interface Detector {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}

/** GS1 check digit: weights 3, 1, 3… from the digit next to the check digit. */
function hasValidCheckDigit(digits: string): boolean {
  let sum = 0
  for (let i = digits.length - 2, weight = 3; i >= 0; i--, weight = 4 - weight) sum += Number(digits[i]) * weight
  return (10 - (sum % 10)) % 10 === Number(digits[digits.length - 1])
}

/** UPC-E (8 digits, compressed) to the UPC-A it stands for, whose check digit it shares. */
function expandUpcE(code: string): string {
  const [system, m, check] = [code[0], code.slice(1, 7), code[7]]
  const last = Number(m[5])
  let body: string
  if (last <= 2) body = `${m[0]}${m[1]}${m[5]}0000${m[2]}${m[3]}${m[4]}`
  else if (last === 3) body = `${m[0]}${m[1]}${m[2]}00000${m[3]}${m[4]}`
  else if (last === 4) body = `${m[0]}${m[1]}${m[2]}${m[3]}00000${m[4]}`
  else body = `${m.slice(0, 5)}0000${m[5]}`
  return `${system}${body}${check}`
}

const GTIN_LENGTHS: Record<string, readonly number[]> = {
  ean_13: [13],
  ean_8: [8],
  upc_a: [12],
  upc_e: [8],
  itf: [14],
  code_128: [8, 12, 13, 14],
}

/**
 * The product code in a detected barcode, or null when it is not a GTIN with a correct check digit — so
 * a misread digit (which always breaks the check digit) is dropped instead of filled into the form.
 */
export function productCode({ rawValue, format }: DetectedBarcode): string | null {
  const code = rawValue.trim()
  if (!/^\d+$/.test(code) || !GTIN_LENGTHS[format]?.includes(code.length)) return null
  if (format === 'upc_e') return /^[01]/.test(code) && hasValidCheckDigit(expandUpcE(code)) ? code : null
  return hasValidCheckDigit(code) ? code : null
}

interface NativeDetectorConstructor {
  new (options: { formats: string[] }): Detector
  getSupportedFormats(): Promise<string[]>
}

let pending: Promise<Detector> | null = null

async function create(): Promise<Detector> {
  const Native = (globalThis as { BarcodeDetector?: NativeDetectorConstructor }).BarcodeDetector
  if (Native) {
    const supported = await Native.getSupportedFormats().catch(() => [] as string[])
    const formats = BARCODE_FORMATS.filter((format) => supported.includes(format))
    if (formats.includes('ean_13')) return new Native({ formats })
  }
  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ])
  prepareZXingModule({
    overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) },
  })
  return new BarcodeDetector({ formats: [...BARCODE_FORMATS] })
}

/** One detector per page, created on first use. */
export function getDetector(): Promise<Detector> {
  pending ??= create().catch((error: unknown) => {
    pending = null
    throw error
  })
  return pending
}

/** Whether this browser can open a camera at all (secure context and a media API). */
export function canUseCamera(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
}

/** Phones and tablets: where reading with this device's own camera is the natural choice. */
export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
}
