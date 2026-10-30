import { RiSettings3Line } from '@remixicon/react'
import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type Language } from '@/app/i18n'
import { SUPPORTED_CURRENCIES } from '@/app/currencies'
import { useCurrency } from '@/app/currency-provider'
import { ACCENTS, useTheme, type Accent, type Theme } from '@/app/theme-provider'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
}

/** Mode tiles: a page color with two card-colored bars, as in the design's Appearance panel. */
const THEME_PREVIEWS: Record<Theme, { ground: string; surface: string }> = {
  light: { ground: '#f3f2f2', surface: '#ffffff' },
  dark: { ground: '#161514', surface: '#2e2b29' },
  system: { ground: 'linear-gradient(135deg, #f3f2f2 50%, #161514 50%)', surface: 'rgb(150 146 146 / 45%)' },
}
const THEMES = Object.keys(THEME_PREVIEWS) as Theme[]
const ACCENT_IDS = Object.keys(ACCENTS) as Accent[]

function PreferenceGroup({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  return (
    <fieldset aria-labelledby={id} className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <span id={id} className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
      {children}
    </fieldset>
  )
}

function OptionButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button
      type="button"
      size="sm"
      variant={pressed ? 'secondary' : 'ghost'}
      aria-pressed={pressed}
      onClick={onClick}
      className="justify-start"
    >
      {children}
    </Button>
  )
}

function ThemeTile({ value, pressed, onClick, label }: { value: Theme; pressed: boolean; onClick: () => void; label: string }) {
  const preview = THEME_PREVIEWS[value]
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="group/tile flex flex-col gap-1.5 rounded-md text-left text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        aria-hidden="true"
        className="flex h-12 flex-col gap-1 rounded-md p-1.5 shadow-[0_0_0_2px_var(--input)] transition-shadow duration-200 group-hover/tile:shadow-[0_0_0_2px_var(--muted-foreground)] group-aria-pressed/tile:shadow-[0_0_0_2px_var(--primary)]"
        style={{ background: preview.ground }}
      >
        <span className="h-2 w-3/5 rounded-full" style={{ background: preview.surface }} />
        <span className="h-3.5 rounded-sm" style={{ background: preview.surface }} />
      </span>
      <span className="group-aria-pressed/tile:font-semibold">{label}</span>
    </button>
  )
}

export function PreferencesPanel() {
  const { t, i18n } = useTranslation()
  const { currency, setCurrency } = useCurrency()
  const { theme, setTheme, accent, setAccent } = useTheme()
  const language = i18n.resolvedLanguage ?? 'en'
  const currencyNames = new Intl.DisplayNames([language], { type: 'currency' })

  return (
    <div className="flex flex-col gap-4">
      <PreferenceGroup label={t('header.language')}>
        <div className="flex flex-col gap-1">
          {SUPPORTED_LANGUAGES.map((code) => (
            <OptionButton key={code} pressed={language === code} onClick={() => void i18n.changeLanguage(code)}>
              {LANGUAGE_NAMES[code]}
            </OptionButton>
          ))}
        </div>
      </PreferenceGroup>

      <PreferenceGroup label={t('header.currency')}>
        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
          {SUPPORTED_CURRENCIES.map((code) => (
            <OptionButton key={code} pressed={currency === code} onClick={() => setCurrency(code)}>
              {currencyNames.of(code) ?? code} ({code})
            </OptionButton>
          ))}
        </div>
      </PreferenceGroup>

      <PreferenceGroup label={t('header.theme')}>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((value) => (
            <ThemeTile
              key={value}
              value={value}
              pressed={theme === value}
              onClick={() => setTheme(value)}
              label={t(`theme.${value}`)}
            />
          ))}
        </div>
      </PreferenceGroup>

      <PreferenceGroup label={t('header.accent')}>
        <div className="flex items-center gap-3.5 px-1 py-1">
          {ACCENT_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={accent === id}
              aria-label={t(`accent.${id}`)}
              title={t(`accent.${id}`)}
              onClick={() => setAccent(id)}
              className="size-7 rounded-full outline-none transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.3,1.4,0.5,1)] hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:hover:scale-100"
              style={{
                background: ACCENTS[id],
                boxShadow: `0 0 0 3px var(--popover), 0 0 0 5px ${accent === id ? ACCENTS[id] : 'transparent'}`,
              }}
            />
          ))}
        </div>
      </PreferenceGroup>
    </div>
  )
}

export function PreferencesMenu() {
  const { t } = useTranslation()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t('header.preferences')}>
          <RiSettings3Line />
          <span className="hidden md:inline">{t('header.preferences')}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <PreferencesPanel />
      </PopoverContent>
    </Popover>
  )
}
