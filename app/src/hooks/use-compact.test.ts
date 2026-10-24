import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useIsCompact } from './use-compact'

const originalMatchMedia = window.matchMedia

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

describe('useIsCompact', () => {
  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('returns true when the compact media query matches', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useIsCompact())
    expect(result.current).toBe(true)
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 639px)')
  })

  it('already matches on the first render (no frame of table layout on phones)', () => {
    mockMatchMedia(true)
    const renders: boolean[] = []
    renderHook(() => {
      const compact = useIsCompact()
      renders.push(compact)
      return compact
    })
    expect(renders[0]).toBe(true)
    expect(renders.every(Boolean)).toBe(true)
  })

  it('returns false when it does not match', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useIsCompact())
    expect(result.current).toBe(false)
  })
})
