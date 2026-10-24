import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

const reduced = vi.hoisted(() => ({ value: false }))
vi.mock('motion/react', () => ({ useReducedMotion: () => reduced.value }))

import { useCountUp } from './use-count-up'

describe('useCountUp', () => {
  beforeEach(() => {
    reduced.value = false
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('returns the value immediately when disabled', () => {
    const { result } = renderHook(() => useCountUp(100, { enabled: false }))
    expect(result.current).toBe(100)
  })

  it('returns the value immediately under reduced motion', () => {
    reduced.value = true
    const { result } = renderHook(() => useCountUp(100))
    expect(result.current).toBe(100)
  })

  it('counts from 0 to the value over the duration', () => {
    vi.useFakeTimers()
    let now = 0
    let callback: FrameRequestCallback | undefined
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      callback = cb
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => {
      callback = undefined
    })
    const step = (ms: number) => {
      now += ms
      act(() => callback?.(now))
    }

    const { result } = renderHook(() => useCountUp(100, { durationMs: 600 }))
    expect(result.current).toBe(0)

    step(0)
    step(300)
    expect(result.current).toBeGreaterThan(0)
    expect(result.current).toBeLessThan(100)

    step(300)
    expect(result.current).toBe(100)
  })
})
