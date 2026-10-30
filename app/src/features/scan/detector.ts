/**
 * Barcode reading for the camera scanner. Browsers with a native BarcodeDetector (Chrome on Android)
 * use it; the others (Safari on iPhone, Firefox) load a ZXing WebAssembly reader on demand, served
 * from this app rather than a CDN. Both stay out of the main bundle until a scanner opens.
 */

export const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'] as const

export interface Detector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>
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
