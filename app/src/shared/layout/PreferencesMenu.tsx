import { RiSettings3Line } from '@remixicon/react'
import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type Language } from '@/app/i18n'
import { SUPPORTED_CURRENCIES } from '@/app/currencies'
import { useCurrency } from '@/app/currency-provider'
import { useTheme, type Theme } from '@/app/theme-provider'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
}

const THEMES: Theme[] = ['light', 'dark', 'system']

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

export function PreferencesPanel() {
  const { t, i18n } = useTranslation()
  const { currency, setCurrency } = useCurrency()
  const { theme, setTheme } = useTheme()
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
        <div className="grid grid-cols-3 gap-1">
          {THEMES.map((value) => (
            <OptionButton key={value} pressed={theme === value} onClick={() => setTheme(value)}>
              {t(`theme.${value}`)}
            </OptionButton>
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
