import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import es from '@/locales/es.json';
import en from '@/locales/en.json';
import eu from '@/locales/eu.json';
import ca from '@/locales/ca.json';
import fr from '@/locales/fr.json';
import ja from '@/locales/ja.json';

export const languages = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'eu', name: 'Euskera' },
  { code: 'ca', name: 'Català' },
  { code: 'fr', name: 'Français' },
  { code: 'ja', name: '日本語' },
] as const;

export type LanguageCode = typeof languages[number]['code'];

const resources = {
  es: { translation: es },
  en: { translation: en },
  eu: { translation: eu },
  ca: { translation: ca },
  fr: { translation: fr },
  ja: { translation: ja },
};

// Get initial language from localStorage or default to 'es'
const getInitialLanguage = (): LanguageCode => {
  const stored = localStorage.getItem('language');
  if (stored && ['es', 'en', 'eu', 'ca', 'fr', 'ja'].includes(stored)) {
    return stored as LanguageCode;
  }
  return 'es';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
