import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFirstLoadAnimation } from './useFirstLoadAnimation'

const reduced = vi.hoisted(() => ({ value: false }))
vi.mock('motion/react', () => ({ useReducedMotion: () => reduced.value }))

describe('useFirstLoadAnimation', () => {
  beforeEach(() => {
    reduced.value = false
  })

  it('fades rows in on the first batch of data, staggered and capped', () => {
    const { result } = renderHook(() => useFirstLoadAnimation(true))
    expect(result.current(0)).toMatchObject({ initial: { opacity: 0 }, animate: { opacity: 1 } })
    expect(result.current(3).transition.delay).toBeCloseTo(0.06)
    expect(result.current(50).transition.delay).toBe(0.2)
  })

  it('does not animate again once rows were shown, even when data changes', () => {
    const { result, rerender } = renderHook(({ hasRows }) => useFirstLoadAnimation(hasRows), {
      initialProps: { hasRows: true },
    })
    rerender({ hasRows: true })
    expect(result.current(0).initial).toBe(false)
    rerender({ hasRows: false })
    rerender({ hasRows: true })
    expect(result.current(0).initial).toBe(false)
  })

  it('keeps animating while still loading, then stops after the first rows', () => {
    const { result, rerender } = renderHook(({ hasRows }) => useFirstLoadAnimation(hasRows), {
      initialProps: { hasRows: false },
    })
    expect(result.current(0).initial).toEqual({ opacity: 0 })
    rerender({ hasRows: true })
    expect(result.current(0).initial).toEqual({ opacity: 0 })
    rerender({ hasRows: true })
    expect(result.current(0).initial).toBe(false)
  })

  it('has no stagger under reduced motion', () => {
    reduced.value = true
    const { result } = renderHook(() => useFirstLoadAnimation(true))
    expect(result.current(7).transition.delay).toBe(0)
  })
})
