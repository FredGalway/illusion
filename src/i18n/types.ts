export type SupportedLanguage =
  | 'fr'
  | 'en'
  | 'es'
  | 'de'
  | 'it'
  | 'pt'
  | 'nl'
  | 'ja'
  | 'zh'
  | 'ru'
  | 'ar'
  | 'ko'
  | 'pl'
  | 'sv'
  | 'da'
  | 'fi'
  | 'no'
  | 'tr'
  | 'el'
  | 'cs';

export interface LanguageMeta {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
}

export type TranslationDictionary = Record<string, string>;
