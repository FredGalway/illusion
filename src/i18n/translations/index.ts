import { SupportedLanguage, TranslationDictionary } from '../types';
import { fr } from './fr';
import { en } from './en';
import { es } from './es';
import { de } from './de';
import { ar } from './ar';
import { ja } from './ja';
import { zh } from './zh';
import { it } from './it';
import { he } from './he';
import { th } from './th';
import { vi } from './vi';
import { pt } from './pt';
import { nl } from './nl';
import { ru } from './ru';
import { ko } from './ko';
import { pl } from './pl';
import { sv } from './sv';
import { da } from './da';
import { fi } from './fi';
import { no } from './no';
import { tr } from './tr';
import { el } from './el';
import { cs } from './cs';

export const TRANSLATIONS: Record<SupportedLanguage, TranslationDictionary> = {
  fr: { ...fr },
  en: { ...en },
  es: { ...es },
  de: { ...de },
  ar: { ...ar },
  ja: { ...ja },
  zh: { ...zh },
  it: { ...it },
  he: { ...he },
  th: { ...th },
  vi: { ...vi },
  pt: { ...pt },
  nl: { ...nl },
  ru: { ...ru },
  ko: { ...ko },
  pl: { ...pl },
  sv: { ...sv },
  da: { ...da },
  fi: { ...fi },
  no: { ...no },
  tr: { ...tr },
  el: { ...el },
  cs: { ...cs },
};
