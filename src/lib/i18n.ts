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

// Country code (ISO 3166-1 alpha-2) to language code mapping
const countryToLanguage: Record<string, LanguageCode> = {
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  VE: 'es',
  EC: 'es',
  GT: 'es',
  CU: 'es',
  BO: 'es',
  DO: 'es',
  HN: 'es',
  PY: 'es',
  SV: 'es',
  NI: 'es',
  CR: 'es',
  PA: 'es',
  UY: 'es',
  FR: 'fr',
  BE: 'fr',
  CH: 'fr',
  CA: 'fr',
  JP: 'ja',
  GB: 'en',
  US: 'en',
  AU: 'en',
  NZ: 'en',
  IE: 'en',
  AD: 'ca',
};

// Detect language from IP geolocation (async, best-effort)
export const detectLanguageFromIP = async (): Promise<LanguageCode> => {
  try {
    const response = await fetch('https://ip-api.com/json/?fields=countryCode', { signal: AbortSignal.timeout(3000) });
    const data = await response.json();
    const country = data?.countryCode as string;
    return countryToLanguage[country] ?? 'en';
  } catch {
    return 'en';
  }
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
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// On first visit (no stored language), detect from IP and update
if (!localStorage.getItem('language')) {
  detectLanguageFromIP().then((lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  });
}

export default i18n;
