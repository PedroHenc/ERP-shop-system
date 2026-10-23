/** Accepts only same-origin paths; anything else (external URLs, `//host`, `/\host`) becomes `/`. */
export function safeRedirect(value: string | null): string {
  if (value === null) return '/'
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/'
  return value
}
