/** Stable React keys for a fixed number of loading placeholders (skeleton rows, cards, sections). */
export function placeholderKeys(count: number): string[] {
  return Array.from({ length: count }, (_, n) => `placeholder-${n}`)
}
