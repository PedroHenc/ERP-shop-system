import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Json = { [key: string]: string | Json }

const modules = import.meta.glob<Json>('../locales/*/*.json', {
  eager: true,
  import: 'default',
})

function namespaces(lng: string): Record<string, Json> {
  const result: Record<string, Json> = {}
  for (const [path, json] of Object.entries(modules)) {
    const match = /\.\.\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path)
    if (match && match[1] === lng && match[2]) result[match[2]] = json
  }
  return result
}

function flatKeys(obj: Json, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'string'
      ? [`${prefix}${key}`]
      : flatKeys(value, `${prefix}${key}.`),
  )
}

async function freshI18n() {
  vi.resetModules()
  return (await import('./i18n')).default
}

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function stubNavigator(language: string) {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue([language])
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(language)
  }

  it('every key in en exists in pt-BR and vice versa', () => {
    const en = namespaces('en')
    const pt = namespaces('pt-BR')
    expect(Object.keys(pt).sort()).toEqual(Object.keys(en).sort())
    expect(Object.keys(en).length).toBeGreaterThan(0)
    for (const ns of Object.keys(en)) {
      expect(flatKeys(pt[ns] ?? {}).sort(), ns).toEqual(flatKeys(en[ns] ?? {}).sort())
    }
  })

  it('falls back to en for an unsupported stored language', async () => {
    stubNavigator('fr')
    localStorage.setItem('erp.language', 'fr')
    const i18n = await freshI18n()
    expect(i18n.resolvedLanguage).toBe('en')
  })

  it.each([
    ['pt-PT', 'pt-BR'],
    ['pt_BR', 'pt-BR'],
    ['en-GB', 'en'],
    ['fr', 'en'],
  ])('detects navigator language %s as %s', async (detected, expected) => {
    stubNavigator(detected)
    const i18n = await freshI18n()
    expect(i18n.resolvedLanguage).toBe(expected)
  })

  it('maps pt to pt-BR', async () => {
    localStorage.setItem('erp.language', 'pt')
    const i18n = await freshI18n()
    expect(i18n.resolvedLanguage).toBe('pt-BR')
    expect(i18n.t('nav.products')).toBe('Produtos')
  })

  it('updates <html lang> on language change', async () => {
    const i18n = await freshI18n()
    await i18n.changeLanguage('pt-BR')
    expect(document.documentElement.lang).toBe('pt-BR')
    await i18n.changeLanguage('en')
    expect(document.documentElement.lang).toBe('en')
  })
})
