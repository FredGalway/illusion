import { SupportedLanguage } from './types';
import { SUPPORTED_LANGUAGES, getLanguageFromCountry } from './countryMap';
import { TRANSLATIONS } from './translations';

const STORAGE_KEY = 'fredericmoitry_lang';

class I18nEngine {
  private currentLang: SupportedLanguage = 'fr';
  private initialized = false;

  constructor() {
    // Initial sync load from localStorage or browser language as immediate default
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
    if (saved && SUPPORTED_LANGUAGES[saved]) {
      this.currentLang = saved;
    } else {
      const browserLang = this.detectBrowserLanguage();
      if (browserLang) {
        this.currentLang = browserLang;
      }
    }
  }

  public getLanguage(): SupportedLanguage {
    return this.currentLang;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    // Apply immediate local translation for preloader & page
    this.applyTranslations();

    // If no manual preference in localStorage, detect country via IP API asynchronously
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      await this.detectIpCountry();
    }

    this.initialized = true;
    this.renderLanguageSwitcher();
  }

  private detectBrowserLanguage(): SupportedLanguage | null {
    if (typeof navigator === 'undefined') return null;
    const lang = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
    const code = lang.split('-')[0] as SupportedLanguage;
    return SUPPORTED_LANGUAGES[code] ? code : null;
  }

  private async detectIpCountry(): Promise<void> {
    try {
      // Call local Serverless API route or fallback API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch('/api/geo', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.country) {
          const detectedLang = getLanguageFromCountry(data.country);
          if (detectedLang && detectedLang !== this.currentLang) {
            this.setLanguage(detectedLang, false);
          }
        }
      }
    } catch {
      // Fallback silently if API is offline or restricted
    }
  }

  public setLanguage(lang: SupportedLanguage, isUserChoice = true): void {
    if (!SUPPORTED_LANGUAGES[lang]) return;

    this.currentLang = lang;
    if (isUserChoice) {
      localStorage.setItem(STORAGE_KEY, lang);
    }

    // Update RTL/LTR document direction if needed
    const meta = SUPPORTED_LANGUAGES[lang];
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', meta.dir || 'ltr');

    this.applyTranslations();
    this.updateSwitcherUI();
  }

  public applyTranslations(): void {
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.fr;

    // 1. Text elements
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key && dict[key] !== undefined) {
        const val = dict[key];
        if (val.includes('<br>') || val.includes('<span') || val.includes('&')) {
          el.innerHTML = val;
        } else {
          el.textContent = val;
        }
      }
    });

    // 2. Input placeholders
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && dict[key] !== undefined) {
        el.placeholder = dict[key];
      }
    });

    // 3. Titles & aria-labels
    document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (key && dict[key] !== undefined) {
        el.title = dict[key];
      }
    });

    // 4. Update preloader dynamically if present
    const preloaderLabel = document.querySelector<HTMLElement>('.preloader__label');
    if (preloaderLabel && dict['preloader.loading']) {
      preloaderLabel.textContent = dict['preloader.loading'];
    }
    const preloaderTagline = document.querySelector<HTMLElement>('.preloader__tagline');
    if (preloaderTagline && dict['preloader.tagline']) {
      preloaderTagline.textContent = dict['preloader.tagline'];
    }
  }

  public renderLanguageSwitcher(): void {
    const navBars = document.querySelectorAll<HTMLElement>('.nav');
    if (navBars.length === 0) {
      if (document.querySelector('.lang-switcher')) return;
      const switcherContainer = document.createElement('div');
      switcherContainer.className = 'lang-switcher lang-switcher--floating';
      const currentMeta = SUPPORTED_LANGUAGES[this.currentLang];
      switcherContainer.innerHTML = `
        <button class="lang-switcher__btn" aria-label="Select Language" aria-expanded="false">
          <span class="lang-switcher__flag">${currentMeta.flag}</span>
          <span class="lang-switcher__code">${currentMeta.code.toUpperCase()}</span>
          <span class="lang-switcher__arrow">▾</span>
        </button>
        <div class="lang-switcher__dropdown" hidden>
          ${Object.values(SUPPORTED_LANGUAGES)
            .map(
              (lang) => `
              <button class="lang-switcher__option ${lang.code === this.currentLang ? 'is-active' : ''}" data-lang="${lang.code}">
                <span class="lang-switcher__flag">${lang.flag}</span>
                <span class="lang-switcher__name">${lang.nativeName}</span>
                <span class="lang-switcher__code-badge">${lang.code.toUpperCase()}</span>
              </button>
            `
            )
            .join('')}
        </div>
      `;
      document.body.appendChild(switcherContainer);
      this.attachSwitcherEvents(switcherContainer);
      return;
    }

    navBars.forEach((nav) => {
      if (nav.querySelector('.lang-switcher')) return;

      const burger = nav.querySelector('.nav__burger');
      const switcherContainer = document.createElement('div');
      switcherContainer.className = 'lang-switcher';

      const currentMeta = SUPPORTED_LANGUAGES[this.currentLang];

      switcherContainer.innerHTML = `
        <button class="lang-switcher__btn" aria-label="Select Language" aria-expanded="false">
          <span class="lang-switcher__flag">${currentMeta.flag}</span>
          <span class="lang-switcher__code">${currentMeta.code.toUpperCase()}</span>
          <span class="lang-switcher__arrow">▾</span>
        </button>
        <div class="lang-switcher__dropdown" hidden>
          ${Object.values(SUPPORTED_LANGUAGES)
            .map(
              (lang) => `
              <button class="lang-switcher__option ${lang.code === this.currentLang ? 'is-active' : ''}" data-lang="${lang.code}">
                <span class="lang-switcher__flag">${lang.flag}</span>
                <span class="lang-switcher__name">${lang.nativeName}</span>
                <span class="lang-switcher__code-badge">${lang.code.toUpperCase()}</span>
              </button>
            `
            )
            .join('')}
        </div>
      `;

      if (burger) {
        nav.insertBefore(switcherContainer, burger);
      } else {
        nav.appendChild(switcherContainer);
      }

      this.attachSwitcherEvents(switcherContainer);
    });
  }

  private attachSwitcherEvents(switcherContainer: HTMLElement): void {
    const btn = switcherContainer.querySelector<HTMLButtonElement>('.lang-switcher__btn');
    const dropdown = switcherContainer.querySelector<HTMLElement>('.lang-switcher__dropdown');

    if (btn && dropdown) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = dropdown.hasAttribute('hidden');
        if (isHidden) {
          dropdown.removeAttribute('hidden');
          btn.setAttribute('aria-expanded', 'true');
        } else {
          dropdown.setAttribute('hidden', '');
          btn.setAttribute('aria-expanded', 'false');
        }
      });

      dropdown.querySelectorAll<HTMLButtonElement>('.lang-switcher__option').forEach((opt) => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const langCode = opt.getAttribute('data-lang') as SupportedLanguage;
          if (langCode) {
            this.setLanguage(langCode, true);
            dropdown.setAttribute('hidden', '');
            btn.setAttribute('aria-expanded', 'false');
          }
        });
      });

      document.addEventListener('click', () => {
        if (!dropdown.hasAttribute('hidden')) {
          dropdown.setAttribute('hidden', '');
          btn.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  private updateSwitcherUI(): void {
    const currentMeta = SUPPORTED_LANGUAGES[this.currentLang];
    document.querySelectorAll<HTMLElement>('.lang-switcher').forEach((switcher) => {
      const codeSpan = switcher.querySelector('.lang-switcher__code');
      const flagSpan = switcher.querySelector('.lang-switcher__flag');

      if (codeSpan) codeSpan.textContent = currentMeta.code.toUpperCase();
      if (flagSpan) flagSpan.textContent = currentMeta.flag;

      switcher.querySelectorAll<HTMLButtonElement>('.lang-switcher__option').forEach((opt) => {
        if (opt.getAttribute('data-lang') === this.currentLang) {
          opt.classList.add('is-active');
        } else {
          opt.classList.remove('is-active');
        }
      });
    });
  }
}

export const i18n = new I18nEngine();
