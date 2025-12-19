import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ptTranslations from './locales/pt.json';
import enTranslations from './locales/en.json';
import frTranslations from './locales/fr.json';

// Map country codes to languages
export const countryToLanguage: Record<string, string> = {
  'AO': 'pt', // Angola - Portuguese
  'CD': 'fr', // DR Congo - French
  'ZA': 'en', // South Africa - English
  'GB': 'en', // UK - English
};

// Get saved language or default to Portuguese
const getSavedLanguage = () => {
  try {
    const saved = localStorage.getItem('agrilink_language');
    return saved || 'pt';
  } catch {
    return 'pt';
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: ptTranslations },
      en: { translation: enTranslations },
      fr: { translation: frTranslations },
    },
    lng: getSavedLanguage(),
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false,
    },
  });

// Function to change language and persist it
export const changeLanguage = (countryCode: string) => {
  const lang = countryToLanguage[countryCode] || 'pt';
  i18n.changeLanguage(lang);
  localStorage.setItem('agrilink_language', lang);
  localStorage.setItem('agrilink_country', countryCode);
};

export const getSavedCountry = () => {
  try {
    return localStorage.getItem('agrilink_country') || 'AO';
  } catch {
    return 'AO';
  }
};

export default i18n;
