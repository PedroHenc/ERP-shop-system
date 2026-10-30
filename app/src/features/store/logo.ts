/** Side of the square logo kept: sharp on high-density screens at the header's 38px. */
export const LOGO_SIZE = 256

/**
 * Turns a picked image into the stored logo: the centred square, scaled to {@link LOGO_SIZE} and encoded
 * as WebP (PNG where the browser cannot encode WebP), so a photo of several MB becomes a few KB.
 */
export async function toLogoDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = LOGO_SIZE
    canvas.height = LOGO_SIZE
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas not available')
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, LOGO_SIZE, LOGO_SIZE)
    return canvas.toDataURL('image/webp', 0.9)
  } finally {
    bitmap.close()
  }
}
