import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY } from './theme-provider'
import { ThemeProvider, useTheme } from './theme-provider'

function Probe() {
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme('dark')}>dark</button>
      <button onClick={() => setTheme('light')}>light</button>
      <button onClick={() => setTheme('system')}>system</button>
    </div>
  )
}

type Listener = (e: { matches: boolean }) => void

function stubMatchMedia(initial: boolean) {
  const original = window.matchMedia
  const listeners = new Set<Listener>()
  const state = { matches: initial }
  window.matchMedia = (query: string) =>
    ({
      get matches() {
        return state.matches
      },
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_: string, l: Listener) => listeners.add(l),
      removeEventListener: (_: string, l: Listener) => listeners.delete(l),
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
  return {
    set(matches: boolean) {
      state.matches = matches
      listeners.forEach((l) => l({ matches }))
    },
    restore() {
      window.matchMedia = original
    },
  }
}

const root = document.documentElement

describe('ThemeProvider', () => {
  let mq: ReturnType<typeof stubMatchMedia> | undefined
  beforeEach(() => root.classList.remove('dark'))
  afterEach(() => {
    mq?.restore()
    mq = undefined
    root.classList.remove('dark')
  })

  it('applies dark class for dark theme and removes it for light', () => {
    const { getByText } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    act(() => getByText('dark').click())
    expect(root.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    act(() => getByText('light').click())
    expect(root.classList.contains('dark')).toBe(false)
  })

  it('defaults to system and follows prefers-color-scheme', () => {
    mq = stubMatchMedia(true)
    const { getByTestId } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(getByTestId('theme')).toHaveTextContent('system')
    expect(root.classList.contains('dark')).toBe(true)
    act(() => mq?.set(false))
    expect(root.classList.contains('dark')).toBe(false)
  })

  it('falls back to system when stored theme is invalid', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'purple')
    const { getByTestId } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(getByTestId('theme')).toHaveTextContent('system')
  })
})
