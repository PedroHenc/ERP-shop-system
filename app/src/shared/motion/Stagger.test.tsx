import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Stagger, StaggerItem } from './Stagger'

const reduced = vi.hoisted(() => ({ value: false }))
const captured = vi.hoisted(() => ({ variants: [] as unknown[] }))
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>()
  return {
    ...actual,
    useReducedMotion: () => reduced.value,
    motion: {
      ...actual.motion,
      div: ({ variants, children, initial: _i, animate: _a, ...rest }: Record<string, unknown>) => {
        captured.variants.push(variants)
        return <div {...(rest as object)}>{children as React.ReactNode}</div>
      },
    },
  }
})

describe('Stagger', () => {
  beforeEach(() => {
    reduced.value = false
    captured.variants = []
  })

  it('renders its items and gives them the fade-up entrance', () => {
    render(
      <Stagger>
        <StaggerItem>One</StaggerItem>
      </Stagger>,
    )
    expect(screen.getByText('One')).toBeInTheDocument()
    expect(captured.variants[1]).toMatchObject({ hidden: { opacity: 0, y: 18 } })
  })

  it('drops movement and stagger under reduced motion', () => {
    reduced.value = true
    render(
      <Stagger>
        <StaggerItem>One</StaggerItem>
      </Stagger>,
    )
    expect(captured.variants[0]).toMatchObject({ visible: { transition: { staggerChildren: 0 } } })
    expect(captured.variants[1]).toEqual({ hidden: { opacity: 0 }, visible: { opacity: 1 } })
  })
})
