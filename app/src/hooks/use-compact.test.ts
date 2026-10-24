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

  it('returns false when it does not match', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useIsCompact())
    expect(result.current).toBe(false)
  })
})
