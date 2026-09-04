import { SupportedLanguage, LanguageMeta } from './types';

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageMeta> = {
  fr: { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', countryIso: 'fr' },
  en: { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', countryIso: 'gb' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', countryIso: 'es' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', countryIso: 'de' },
  it: { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', countryIso: 'it' },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', countryIso: 'pt' },
  nl: { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', countryIso: 'nl' },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', countryIso: 'jp' },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', countryIso: 'cn' },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', countryIso: 'ru' },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', countryIso: 'sa', dir: 'rtl' },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', countryIso: 'kr' },
  pl: { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', countryIso: 'pl' },
  sv: { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', countryIso: 'se' },
  da: { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', countryIso: 'dk' },
  fi: { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', countryIso: 'fi' },
  no: { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', countryIso: 'no' },
  tr: { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', countryIso: 'tr' },
  el: { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', countryIso: 'gr' },
  cs: { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', countryIso: 'cz' },
  he: { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', countryIso: 'il', dir: 'rtl' },
  th: { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', countryIso: 'th' },
  vi: { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', countryIso: 'vn' },
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
  IL: 'he',
  TH: 'th',
  VN: 'vi',
};

export function getLanguageFromCountry(countryCode: string | null): SupportedLanguage | null {
  if (!countryCode) return null;
  const upper = countryCode.toUpperCase().trim();
  return COUNTRY_TO_LANG[upper] || null;
}
