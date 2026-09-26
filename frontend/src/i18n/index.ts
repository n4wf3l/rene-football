import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import fr from './locales/fr.json'
import en from './locales/en.json'
import de from './locales/de.json'
import lb from './locales/lb.json'
import nl from './locales/nl.json'

/** Supported UI languages. `fr` is the source of truth (the site is French-first);
 *  the others carry the same key tree translated. */
export const SUPPORTED_LOCALES = ['fr', 'en', 'de', 'lb', 'nl'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

const STORAGE_KEY = 'rene_lang'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      de: { translation: de },
      lb: { translation: lb },
      nl: { translation: nl },
    },
    fallbackLng: 'fr',
    supportedLngs: SUPPORTED_LOCALES as unknown as string[],
    // Only touch the language part (fr vs fr-BE both resolve to fr).
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: STORAGE_KEY,
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
    returnNull: false,
  })

// Reflect the active language on <html lang="…"> so screen readers and SEO
// pick it up. Kept in sync on every change.
if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.resolvedLanguage ?? 'fr'
  i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng
  })
}

export default i18n
