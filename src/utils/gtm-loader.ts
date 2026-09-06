/**
 * Geo-Aware Asynchronous GTM & Font Mirror Manager
 * Optimizes performance globally and prevents GFW timeouts/lag in China.
 */

export interface GeoLocationResult {
  country: string | null;
  isChina: boolean;
}

/**
 * Detect if current user environment is located in or targeting China
 */
export async function detectChinaRegion(): Promise<GeoLocationResult> {
  // Fast client-side checks (Timezone & Locale)
  try {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const isChinaTimezone = /Asia\/(Shanghai|Chongqing|Urumqi|Harbin|Kashgar)/i.test(userTimezone);

    const navLanguages = navigator.languages || [navigator.language || ''];
    const isZhLanguage = navLanguages.some(lang => /^zh-CN/i.test(lang));

    if (isChinaTimezone || isZhLanguage) {
      return { country: 'CN', isChina: true };
    }
  } catch (e) {
    // Ignore timezone error
  }

  // Fetch Vercel IP Geo API endpoint with 1.5s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch('/api/geo.js', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const country = data.country ? String(data.country).toUpperCase() : null;
      if (country === 'CN') {
        return { country: 'CN', isChina: true };
      }
      if (country) {
        return { country, isChina: false };
      }
    }
  } catch (err) {
    // API timeout or missing serverless env - default to fallback
  }

  // Fallback for local dev (localhost:5173) or non-Vercel environment
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const country = (data.country_code || data.country || '').toUpperCase();
      return { country: country || null, isChina: country === 'CN' };
    }
  } catch (err) {
    // Ignore fallback error
  }

  return { country: null, isChina: false };
}

/**
 * Initialize Font Mirror for China traffic (fonts.geekzu.org)
 */
export function initFontMirror(isChina: boolean): void {
  if (!isChina) return;

  const mirrorElement = document.getElementById('js-china-font-mirror') as HTMLLinkElement | null;
  if (mirrorElement) {
    mirrorElement.disabled = false;
    mirrorElement.rel = 'stylesheet';
  }
}

/**
 * Initialize GTM asynchronously for non-China traffic
 */
export function initGeoAwareGTM(gtmContainerId: string = 'GTM-XXXXXXX'): void {
  const scheduleInit = () => {
    const execute = async () => {
      const geoResult = await detectChinaRegion();

      // Enable Chinese font mirror if needed
      initFontMirror(geoResult.isChina);

      // If user is in China, bypass GTM to avoid GFW network lag & timeout
      if (geoResult.isChina) {
        (window as any).gtm_disabled = true;
        document.querySelectorAll('[src*="googletagmanager"], [src*="gtag/js"]').forEach((el) => el.remove());
        console.log('[Geo-Optimization] Traffic detected from China region. Bypassing Google Tag Manager to ensure instant load.');
        return;
      }

      // Skip if GTM container ID is dummy / unconfigured
      if (!gtmContainerId || gtmContainerId.includes('XXXXXXX')) {
        return;
      }

      // Inject GTM script non-blocking
      try {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmContainerId)}`;
        document.head.appendChild(script);
      } catch (err) {
        console.warn('[GTM Loader] Async GTM script injection failed:', err);
      }
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => execute(), { timeout: 3500 });
    } else {
      setTimeout(execute, 2000);
    }
  };

  if (document.readyState === 'complete') {
    scheduleInit();
  } else {
    window.addEventListener('load', scheduleInit, { once: true });
  }
}
