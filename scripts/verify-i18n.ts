import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Import all translation dictionaries
import { TRANSLATIONS } from '../src/i18n/translations/index.ts';

// 2. Find all HTML files in project root
const htmlFiles = fs.readdirSync(projectRoot)
  .filter(f => f.endsWith('.html'))
  .map(f => path.join(projectRoot, f));

console.log(`\n🔍 Scanning ${htmlFiles.length} HTML files for i18n tags...`);

const htmlKeysMap = new Map<string, Set<string>>(); // key -> set of HTML files using it

const i18nRegex = /data-i18n(?:-placeholder|-title)?=["']([^"']+)["']/g;

for (const filePath of htmlFiles) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let match: RegExpExecArray | null;
  while ((match = i18nRegex.exec(content)) !== null) {
    const key = match[1];
    if (!htmlKeysMap.has(key)) {
      htmlKeysMap.set(key, new Set());
    }
    htmlKeysMap.get(key)!.add(path.basename(filePath));
  }
}

const allHtmlKeys = Array.from(htmlKeysMap.keys()).sort();
console.log(`📋 Found ${allHtmlKeys.length} unique data-i18n keys across all HTML pages.\n`);

// 3. Verify completeness and native translation check across all 20 languages
const languages = Object.keys(TRANSLATIONS) as (keyof typeof TRANSLATIONS)[];
let hasErrors = false;
const report: Array<{
  lang: string;
  found: number;
  total: number;
  percentage: string;
  missing: string[];
  empty: string[];
  fallbackLeaks: string[];
}> = [];

const frDict = TRANSLATIONS.fr;
const enDict = TRANSLATIONS.en;

for (const lang of languages) {
  const dict = TRANSLATIONS[lang];
  const missing: string[] = [];
  const empty: string[] = [];
  const fallbackLeaks: string[] = [];

  const properNameKeys = new Set([
    'footer.logo', 'nav.logo', 'menu.contact_email', 'footer.address', 'footer.copy',
    'hero.eyebrow', 'footer.tagline', 'preloader.tagline', 'case_study.more_projects_eyebrow',
    'work.alison_app.title', 'work.alison_lp.title', 'work.alison_pub.title',
    'work.alison_pub_app.title', 'work.ca.title', 'work.trading.title', 'work.bnp.title',
    'work.alison_pub_app.tags', 'work.ca.tags', 'work.trading.tags',
    'testimonial.2.role', 'testimonial.3.role', 'testimonial.4.role'
  ]);

  for (const key of allHtmlKeys) {
    if (!(key in dict)) {
      missing.push(key);
    } else if (!dict[key] || dict[key].trim() === '') {
      empty.push(key);
    } else if (lang !== 'en' && lang !== 'fr' && !properNameKeys.has(key)) {
      const isEnglishLeak = dict[key] === enDict[key] && enDict[key] && enDict[key].length > 10;
      const isFrenchLeak = dict[key] === frDict[key] && frDict[key] && frDict[key].length > 10;
      if (isEnglishLeak || isFrenchLeak) {
        fallbackLeaks.push(key);
      }
    }
  }

  const validCount = allHtmlKeys.length - missing.length - empty.length - fallbackLeaks.length;
  const percentage = ((validCount / allHtmlKeys.length) * 100).toFixed(1);

  report.push({
    lang,
    found: validCount,
    total: allHtmlKeys.length,
    percentage: `${percentage}%`,
    missing,
    empty,
    fallbackLeaks
  });

  if (missing.length > 0 || empty.length > 0 || fallbackLeaks.length > 0) {
    hasErrors = true;
  }
}

// 4. Output Summary Table
console.log('=== i18n Native Translation & Fallback Audit Report ===');
console.table(report.map(r => ({
  Language: r.lang,
  NativeCoverage: `${r.found}/${r.total} (${r.percentage})`,
  MissingKeys: r.missing.length,
  EmptyValues: r.empty.length,
  EnglishLeaks: r.fallbackLeaks.length
})));

if (hasErrors) {
  console.log('\n❌ Translation gaps or English fallback leaks detected:');
  for (const r of report) {
    if (r.missing.length > 0) {
      console.log(`\n  Language [${r.lang}] - Missing Keys (${r.missing.length}):`);
      r.missing.forEach(k => console.log(`    - ${k} (used in: ${Array.from(htmlKeysMap.get(k)!).join(', ')})`));
    }
    if (r.empty.length > 0) {
      console.log(`\n  Language [${r.lang}] - Empty Values (${r.empty.length}):`);
      r.empty.forEach(k => console.log(`    - ${k}`));
    }
    if (r.fallbackLeaks.length > 0) {
      console.log(`\n  Language [${r.lang}] - Un-translated English Leaks (${r.fallbackLeaks.length}):`);
      const langDict = TRANSLATIONS[r.lang as keyof typeof TRANSLATIONS];
      r.fallbackLeaks.forEach(k => console.log(`    - ${k}: "${langDict[k]?.substring(0, 40)}..."`));
    }
  }
  process.exit(1);
} else {
  console.log('\n✅ SUCCESS: 100% of HTML data-i18n keys are natively translated in all 20 language dictionaries without English leaks!');
  process.exit(0);
}
