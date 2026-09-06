import { SupportedLanguage } from './types';
import { SUPPORTED_LANGUAGES, getLanguageFromCountry } from './countryMap';
import { TRANSLATIONS } from './translations';

const STORAGE_KEY = 'fredericmoitry_lang';

class I18nEngine {
  private currentLang: SupportedLanguage = 'fr';
  private initialized = false;

  constructor() {
    // 1. Check URL query parameter first (?lang=en, ?lang=de, ?lang=es, etc.)
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlLang = urlParams ? (urlParams.get('lang') as SupportedLanguage) : null;

    if (urlLang && SUPPORTED_LANGUAGES[urlLang]) {
      this.currentLang = urlLang;
    } else {
      // 2. Initial sync load from localStorage or browser language as immediate default
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
  }

  public getLanguage(): SupportedLanguage {
    return this.currentLang;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    // Apply immediate local translation for preloader & page
    this.applyTranslations();

    // If no explicit URL query param or manual preference in localStorage, detect country via IP API
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlLang = urlParams ? (urlParams.get('lang') as SupportedLanguage) : null;
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!urlLang && !saved) {
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
      // Call local Serverless API route
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
          return;
        }
      }
    } catch {
      // Fallback silently if API is offline or restricted
    }

    // Fallback for local dev (localhost:5173) or non-Vercel environment
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const country = data.country_code || data.country;
        if (country) {
          const detectedLang = getLanguageFromCountry(country);
          if (detectedLang && detectedLang !== this.currentLang) {
            this.setLanguage(detectedLang, false);
          }
        }
      }
    } catch {
      // Ignore if fallback API fails
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
    const fallbackDict = TRANSLATIONS.fr;

    // 1. Text elements
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        const val = dict[key] !== undefined ? dict[key] : fallbackDict[key];
        if (val !== undefined) {
          if (val.includes('<br>') || val.includes('<span') || val.includes('&')) {
            el.innerHTML = val;
          } else {
            el.textContent = val;
          }
        }
      }
    });

    // 2. Input placeholders
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        const val = dict[key] !== undefined ? dict[key] : fallbackDict[key];
        if (val !== undefined) {
          el.placeholder = val;
        }
      }
    });

    // 3. Titles & aria-labels
    document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        const val = dict[key] !== undefined ? dict[key] : fallbackDict[key];
        if (val !== undefined) {
          el.title = val;
        }
      }
    });

    // 4. Update preloader dynamically if present
    const preloaderLabel = document.querySelector<HTMLElement>('.preloader__label');
    const loadingVal = dict['preloader.loading'] || fallbackDict['preloader.loading'];
    if (preloaderLabel && loadingVal) {
      preloaderLabel.textContent = loadingVal;
    }
    const preloaderTagline = document.querySelector<HTMLElement>('.preloader__tagline');
    const taglineVal = dict['preloader.tagline'] || fallbackDict['preloader.tagline'];
    if (preloaderTagline && taglineVal) {
      preloaderTagline.textContent = taglineVal;
    }

    // 5. Update Document Title & Meta Description for international SEO & browser tab
    if (dict['hero.eyebrow']) {
      document.title = `Frédéric Moitry — ${dict['hero.eyebrow']}`;
    }
    const metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (metaDesc && dict['manifesto.statement']) {
      const cleanDesc = dict['manifesto.statement'].replace(/<[^>]*>/g, '').trim();
      metaDesc.setAttribute('content', cleanDesc.slice(0, 160) + '...');
    }

    // 6. Update CV Links dynamically (French CV for 'fr', English CV for all non-French languages)
    const cvFile = this.currentLang === 'fr' ? 'CV-FREDERIC-MOITRY-2026-Fr.pdf' : 'CV-FREDERIC-MOITRY-2026-En.pdf';
    const cvPath = `/cv/${cvFile}`;
    document.querySelectorAll<HTMLAnchorElement>('#js-cv-link, a[href*="CV-FREDERIC-MOITRY"]').forEach((link) => {
      link.href = cvPath;
    });
  }

  public renderLanguageSwitcher(): void {
    const renderFlag = (meta: { countryIso: string; code: string }) => `
      <img src="https://flagcdn.com/20x15/${meta.countryIso}.png" 
           srcset="https://flagcdn.com/40x30/${meta.countryIso}.png 2x" 
           width="20" height="15" 
           alt="${meta.code.toUpperCase()}" 
           class="lang-switcher__flag-img" />
    `;

    // 1. Ensure Centered Language Popup Modal exists on document body
    let modal = document.getElementById('js-lang-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'js-lang-modal';
      modal.className = 'lang-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Select Language');
      modal.setAttribute('hidden', '');

      modal.innerHTML = `
        <div class="lang-modal__backdrop" id="js-lang-modal-backdrop"></div>
        <div class="lang-modal__card">
          <div class="lang-modal__header">
            <div class="lang-modal__title-group">
              <h2 class="lang-modal__title" data-i18n="menu.languages">Langues</h2>
              <p class="lang-modal__subtitle" data-i18n="menu.languages_subtitle">Sélectionnez la langue et la zone géographique</p>
            </div>
            <button type="button" class="lang-modal__close" id="js-lang-modal-close" aria-label="Close modal">✕</button>
          </div>
          <div class="lang-modal__grid" id="js-lang-modal-grid">
            ${Object.values(SUPPORTED_LANGUAGES)
              .map(
                (lang) => `
                <button type="button" class="lang-modal__option ${lang.code === this.currentLang ? 'is-active' : ''}" data-lang="${lang.code}">
                  <span class="lang-switcher__flag">${renderFlag(lang)}</span>
                  <span class="lang-modal__name">${lang.nativeName}</span>
                  <span class="lang-modal__code-badge">${lang.code.toUpperCase()}</span>
                </button>
              `
              )
              .join('')}
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Event listeners for closing modal
      const closeModal = () => {
        modal?.setAttribute('hidden', '');
        modal?.classList.remove('is-open');
      };

      const closeBtn = document.getElementById('js-lang-modal-close');
      const backdrop = document.getElementById('js-lang-modal-backdrop');

      closeBtn?.addEventListener('click', closeModal);
      backdrop?.addEventListener('click', closeModal);

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal?.hasAttribute('hidden')) {
          closeModal();
        }
      });

      // Handle language selection click
      modal.querySelectorAll<HTMLButtonElement>('.lang-modal__option').forEach((opt) => {
        opt.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const langCode = opt.getAttribute('data-lang') as SupportedLanguage;
          if (langCode) {
            this.setLanguage(langCode, true);
            closeModal();
          }
        });
      });

      // Translate modal elements right after creation
      this.applyTranslations();
    }

    const openModal = (e?: Event) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      this.applyTranslations();
      modal?.removeAttribute('hidden');
      requestAnimationFrame(() => {
        modal?.classList.add('is-open');
      });
    };

    // 2. Attach toggle listener to menu overlay 06 item
    const menuLangToggle = document.getElementById('js-menu-lang-toggle');
    if (menuLangToggle) {
      menuLangToggle.addEventListener('click', openModal);
    }

    this.updateSwitcherUI();
  }

  private updateSwitcherUI(): void {
    const currentMeta = SUPPORTED_LANGUAGES[this.currentLang];

    // Update Menu Overlay language badge
    const menuLangBadge = document.getElementById('js-menu-lang-badge');
    if (menuLangBadge) {
      menuLangBadge.innerHTML = `
        <img src="https://flagcdn.com/20x15/${currentMeta.countryIso}.png" 
             srcset="https://flagcdn.com/40x30/${currentMeta.countryIso}.png 2x" 
             width="20" height="15" 
             alt="${currentMeta.code.toUpperCase()}" 
             class="lang-switcher__flag-img" />
        <span class="menu-overlay__lang-code">${currentMeta.code.toUpperCase()}</span>
        <span class="menu-overlay__lang-arrow">▾</span>
      `;
    }

    // Update Modal grid options active state
    const modalGrid = document.getElementById('js-lang-modal-grid');
    if (modalGrid) {
      modalGrid.querySelectorAll<HTMLButtonElement>('.lang-modal__option').forEach((opt) => {
        if (opt.getAttribute('data-lang') === this.currentLang) {
          opt.classList.add('is-active');
        } else {
          opt.classList.remove('is-active');
        }
      });
    }
  }
}

export const i18n = new I18nEngine();
