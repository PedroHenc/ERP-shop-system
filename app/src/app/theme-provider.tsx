import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'
export const THEME_STORAGE_KEY = 'erp.theme'

/** Accent colors from the Modernist design; the swatch color matches `--brand` in index.css. */
export const ACCENTS = {
  red: '#ec3013',
  blue: '#2f5bea',
  green: '#12875a',
  amber: '#b45f06',
} as const
export type Accent = keyof typeof ACCENTS
export const DEFAULT_ACCENT: Accent = 'red'
export const ACCENT_STORAGE_KEY = 'erp.accent'

interface ThemeContextValue {
  theme: Theme
  setTheme(theme: Theme): void
  /** The theme actually applied: `system` resolved against the OS preference. */
  resolvedTheme: 'light' | 'dark'
  accent: Accent
  setAccent(accent: Accent): void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const DARK_QUERY = '(prefers-color-scheme: dark)'

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

function isAccent(value: unknown): value is Accent {
  return typeof value === 'string' && Object.hasOwn(ACCENTS, value)
}

function readStoredAccent(): Accent {
  try {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY)
    return isAccent(stored) ? stored : DEFAULT_ACCENT
  } catch {
    return DEFAULT_ACCENT
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage unavailable (e.g. private mode): keep the choice in memory only.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const [accent, setAccentState] = useState<Accent>(readStoredAccent)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_QUERY).matches)

  useEffect(() => {
    const root = document.documentElement
    if (theme !== 'system') {
      root.classList.toggle('dark', theme === 'dark')
      return
    }
    const media = window.matchMedia(DARK_QUERY)
    const apply = () => {
      setSystemDark(media.matches)
      root.classList.toggle('dark', media.matches)
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.accent = accent
  }, [accent])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    store(THEME_STORAGE_KEY, next)
  }, [])

  const setAccent = useCallback((next: Accent) => {
    setAccentState(next)
    store(ACCENT_STORAGE_KEY, next)
  }, [])

  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme, accent, setAccent }),
    [theme, setTheme, resolvedTheme, accent, setAccent],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
