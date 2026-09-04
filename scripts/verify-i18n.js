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

console.log(`🔍 Scanning ${htmlFiles.length} HTML files for i18n tags...`);

const htmlKeysMap = new Map(); // key -> set of HTML files using it

const i18nRegex = /data-i18n(?:-placeholder|-title)?=["']([^"']+)["']/g;

for (const filePath of htmlFiles) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let match;
  while ((match = i18nRegex.exec(content)) !== null) {
    const key = match[1];
    if (!htmlKeysMap.has(key)) {
      htmlKeysMap.set(key, new Set());
    }
    htmlKeysMap.get(key).add(path.basename(filePath));
  }
}

const allHtmlKeys = Array.from(htmlKeysMap.keys()).sort();
console.log(`📋 Found ${allHtmlKeys.length} unique data-i18n keys across all HTML pages.\n`);

// 3. Verify completeness across all 20 languages
const languages = Object.keys(TRANSLATIONS);
let hasErrors = false;
const report = [];

for (const lang of languages) {
  const dict = TRANSLATIONS[lang];
  const missing = [];
  const empty = [];

  for (const key of allHtmlKeys) {
    if (!(key in dict)) {
      missing.push(key);
    } else if (!dict[key] || dict[key].trim() === '') {
      empty.push(key);
    }
  }

  const foundCount = allHtmlKeys.length - missing.length - empty.length;
  const percentage = ((foundCount / allHtmlKeys.length) * 100).toFixed(1);

  report.push({
    lang,
    found: foundCount,
    total: allHtmlKeys.length,
    percentage: `${percentage}%`,
    missing,
    empty
  });

  if (missing.length > 0 || empty.length > 0) {
    hasErrors = true;
  }
}

// 4. Output Summary Table
console.log('=== i18n Translation Completeness Report ===');
console.table(report.map(r => ({
  Language: r.lang,
  Coverage: `${r.found}/${r.total} (${r.percentage})`,
  MissingKeys: r.missing.length,
  EmptyValues: r.empty.length
})));

if (hasErrors) {
  console.log('\n❌ Missing or empty translation keys detected:');
  for (const r of report) {
    if (r.missing.length > 0) {
      console.log(`\n  Language [${r.lang}] - Missing (${r.missing.length}):`);
      r.missing.forEach(k => console.log(`    - ${k} (used in: ${Array.from(htmlKeysMap.get(k)).join(', ')})`));
    }
    if (r.empty.length > 0) {
      console.log(`\n  Language [${r.lang}] - Empty (${r.empty.length}):`);
      r.empty.forEach(k => console.log(`    - ${k}`));
    }
  }
  process.exit(1);
} else {
  console.log('\n✅ SUCCESS: 100% of HTML data-i18n keys are present and populated in all 20 language dictionaries!');
  process.exit(0);
}
