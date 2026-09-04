import { SupportedLanguage, LanguageMeta } from './types';

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageMeta> = {
  fr: { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  en: { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  it: { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  nl: { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  pl: { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  sv: { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  da: { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  fi: { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  no: { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  tr: { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  el: { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
  cs: { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿' },
};

// Maps 2-letter Country ISO codes to corresponding language
export const COUNTRY_TO_LANG: Record<string, SupportedLanguage> = {
  FR: 'fr', BE: 'fr', CH: 'fr', MC: 'fr', LU: 'fr', CA: 'en',
  GB: 'en', US: 'en', AU: 'en', NZ: 'en', IE: 'en', ZA: 'en',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  DE: 'de', AT: 'de',
  IT: 'it',
  PT: 'pt', BR: 'pt',
  NL: 'nl',
  JP: 'ja',
  CN: 'zh', TW: 'zh', HK: 'zh',
  RU: 'ru', BY: 'ru', KZ: 'ru',
  SA: 'ar', AE: 'ar', EG: 'ar', MA: 'ar', DZ: 'ar', QA: 'ar',
  KR: 'ko',
  PL: 'pl',
  SE: 'sv',
  DK: 'da',
  FI: 'fi',
  NO: 'no',
  TR: 'tr',
  GR: 'el',
  CZ: 'cs',
};

export function getLanguageFromCountry(countryCode: string | null): SupportedLanguage | null {
  if (!countryCode) return null;
  const upper = countryCode.toUpperCase().trim();
  return COUNTRY_TO_LANG[upper] || null;
}
