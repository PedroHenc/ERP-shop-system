import { act, render, renderHook, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LAYOUT_ANIMATION_LIMIT } from '@/shared/motion/presets'
import { useRowMotion } from './useRowMotion'

const reduced = vi.hoisted(() => ({ value: false }))
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useReducedMotionConfig: () => reduced.value,
}))

describe('useRowMotion', () => {
  beforeEach(() => {
    reduced.value = false
  })

  it('fades the first batch in, staggered and capped', () => {
    const { result } = renderHook(() => useRowMotion('t', true, 3))
    expect(result.current.rowProps(0, 'a')).toMatchObject({ initial: { opacity: 0 }, animate: { opacity: 1 } })
    expect(result.current.rowProps(3, 'a').transition.delay).toBeCloseTo(0.06)
    expect(result.current.rowProps(50, 'a').transition.delay).toBe(0.2)
  })

  it('after the first batch finished entering, new rows fade in quickly without stagger', () => {
    const { result } = renderHook(() => useRowMotion('t', true, 3))
    act(() => result.current.rowProps(0, 'a').onAnimationComplete?.())
    const props = result.current.rowProps(5, 'a')
    expect(props.onAnimationComplete).toBeUndefined()
    expect(props.transition).not.toHaveProperty('delay')
    expect(props.transition).toMatchObject({ duration: 0.15 })
  })

  it('has no stagger under reduced motion', () => {
    reduced.value = true
    const { result } = renderHook(() => useRowMotion('t', true, 3))
    expect(result.current.rowProps(7, 'a').transition.delay).toBe(0)
  })

  it('animates reordering only up to the layout limit', () => {
    const small = renderHook(() => useRowMotion('t', true, LAYOUT_ANIMATION_LIMIT))
    expect(small.result.current.rowProps(0, 'a').layout).toBe('position')
    const large = renderHook(() => useRowMotion('t', true, LAYOUT_ANIMATION_LIMIT + 1))
    expect(large.result.current.rowProps(0, 'a').layout).toBe(false)
  })

  it('renders the highlight only for the hovered row and clears it when the pointer leaves', () => {
    const { result } = renderHook(() => useRowMotion('t', true, 2))
    act(() => result.current.rowProps(0, 'a').onMouseEnter())
    const { rerender } = render(<>{result.current.highlight('a')}{result.current.highlight('b')}</>)
    expect(screen.getAllByTestId('row-highlight')).toHaveLength(1)
    act(() => result.current.bodyProps.onMouseLeave())
    rerender(<div>{result.current.highlight('a')}</div>)
    expect(screen.queryByTestId('row-highlight')).not.toBeInTheDocument()
  })
})
