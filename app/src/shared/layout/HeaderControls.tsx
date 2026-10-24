import { RiComputerLine, RiGlobalLine, RiMoneyDollarCircleLine, RiMoonLine, RiSunLine } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type Language } from '@/app/i18n'
import { SUPPORTED_CURRENCIES, isCurrencyCode } from '@/app/currencies'
import { useCurrency } from '@/app/currency-provider'
import { useTheme, type Theme } from '@/app/theme-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
}

const THEMES: Theme[] = ['light', 'dark', 'system']

function isLanguage(value: string): value is Language {
  return SUPPORTED_LANGUAGES.some((l) => l === value)
}

function isTheme(value: string): value is Theme {
  return THEMES.some((t) => t === value)
}

export function HeaderControls() {
  const { t, i18n } = useTranslation()
  const { currency, setCurrency } = useCurrency()
  const { theme, setTheme } = useTheme()
  const language = i18n.resolvedLanguage ?? 'en'
  const currencyNames = new Intl.DisplayNames([language], { type: 'currency' })
  const ThemeIcon = theme === 'dark' ? RiMoonLine : theme === 'light' ? RiSunLine : RiComputerLine

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('header.language')}>
            <RiGlobalLine />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={language}
            onValueChange={(value) => {
              if (isLanguage(value)) void i18n.changeLanguage(value)
            }}
          >
            {SUPPORTED_LANGUAGES.map((code) => (
              <DropdownMenuRadioItem key={code} value={code}>
                {LANGUAGE_NAMES[code]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('header.currency')}>
            <RiMoneyDollarCircleLine />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={currency}
            onValueChange={(value) => {
              if (isCurrencyCode(value)) setCurrency(value)
            }}
          >
            {SUPPORTED_CURRENCIES.map((code) => (
              <DropdownMenuRadioItem key={code} value={code}>
                {currencyNames.of(code) ?? code} ({code})
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('header.theme')}>
            <ThemeIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value) => {
              if (isTheme(value)) setTheme(value)
            }}
          >
            {THEMES.map((value) => (
              <DropdownMenuRadioItem key={value} value={value}>
                {t(`theme.${value}`)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
