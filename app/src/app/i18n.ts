import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import enCommon from '@/locales/en/common.json'
import enAuth from '@/locales/en/auth.json'
import enBrands from '@/locales/en/brands.json'
import enSuppliers from '@/locales/en/suppliers.json'
import enProducts from '@/locales/en/products.json'
import enReports from '@/locales/en/reports.json'
import enSales from '@/locales/en/sales.json'
import enStock from '@/locales/en/stock.json'
import enUsers from '@/locales/en/users.json'
import ptBRCommon from '@/locales/pt-BR/common.json'
import ptBRAuth from '@/locales/pt-BR/auth.json'
import ptBRBrands from '@/locales/pt-BR/brands.json'
import ptBRSuppliers from '@/locales/pt-BR/suppliers.json'
import ptBRProducts from '@/locales/pt-BR/products.json'
import ptBRReports from '@/locales/pt-BR/reports.json'
import ptBRSales from '@/locales/pt-BR/sales.json'
import ptBRStock from '@/locales/pt-BR/stock.json'
import ptBRUsers from '@/locales/pt-BR/users.json'

export const SUPPORTED_LANGUAGES = ['en', 'pt-BR'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]
export const LANGUAGE_STORAGE_KEY = 'erp.language'

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    products: enProducts,
    brands: enBrands,
    suppliers: enSuppliers,
    stock: enStock,
    sales: enSales,
    reports: enReports,
    users: enUsers,
  },
  'pt-BR': {
    common: ptBRCommon,
    auth: ptBRAuth,
    products: ptBRProducts,
    brands: ptBRBrands,
    suppliers: ptBRSuppliers,
    stock: ptBRStock,
    sales: ptBRSales,
    reports: ptBRReports,
    users: ptBRUsers,
  },
} as const

// nonExplicitSupportedLngs strips the region before checking supportedLngs, which
// rejects 'pt-BR' (only the full code is listed). Map regional variants ourselves.
function toSupportedLanguage(detected: string): string {
  if (/^pt([-_]|$)/i.test(detected)) return 'pt-BR'
  if (/^en([-_]|$)/i.test(detected)) return 'en'
  return detected
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    fallbackLng: 'en',
    load: 'currentOnly',
    defaultNS: 'common',
    ns: ['common', 'auth', 'products', 'brands', 'suppliers', 'users'],
    initAsync: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
      convertDetectedLanguage: toSupportedLanguage,
    },
  })

function syncHtmlLang(language: string | undefined) {
  if (language) document.documentElement.lang = language
}

syncHtmlLang(i18n.resolvedLanguage)
i18n.on('languageChanged', () => syncHtmlLang(i18n.resolvedLanguage))

export default i18n
