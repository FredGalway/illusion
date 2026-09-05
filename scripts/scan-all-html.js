import fs from 'fs';
import path from 'path';

const htmlFiles = fs.readdirSync('.').filter((f) => f.endsWith('.html'));

const tagRegex = /<([a-z1-6]+)([^>]*)>([^<]+)<\/\1>/gi;

htmlFiles.forEach((file) => {
  const html = fs.readFileSync(file, 'utf8');
  let match;
  const missing = [];

  while ((match = tagRegex.exec(html)) !== null) {
    const tagName = match[1].toLowerCase();
    const attrs = match[2];
    const text = match[3].trim();

    if (['script', 'style', 'svg', 'path', 'code', 'title'].includes(tagName)) continue;

    // Ignore numbers, symbols, names, emails, URLs
    if (
      text.length > 1 &&
      !/^[0-9\s\.\,\+\-\/\%\→\←\↗\↓\©\·\:\|\-\–\—\✕\▸\•]+$/.test(text) &&
      !/^[A-Z][a-z]+(\s[A-Z][a-z]+)+$/.test(text) && // Author names like Anne-Lyse Leroy
      !text.includes('@') &&
      !text.includes('.fr') &&
      !text.includes('.com')
    ) {
      if (!attrs.includes('data-i18n')) {
        missing.push(`Line ~ : <${tagName} ${attrs.trim()}> -> "${text}"`);
      }
    }
  }

  if (missing.length > 0) {
    console.log(`\n=== ${file} (${missing.length} missing data-i18n) ===`);
    missing.forEach((m) => console.log(m));
  }
});
