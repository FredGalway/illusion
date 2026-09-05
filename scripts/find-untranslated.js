import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf8');

// Regex to find tags: <tag ... >text</tag>
const tagRegex = /<([a-z1-6]+)([^>]*)>([^<]+)<\/\1>/gi;

let match;
const missing = [];

while ((match = tagRegex.exec(html)) !== null) {
  const tagName = match[1].toLowerCase();
  const attrs = match[2];
  const text = match[3].trim();

  if (['script', 'style', 'svg', 'path', 'code'].includes(tagName)) continue;

  if (text.length > 1 && !/^[0-9\s\.\,\+\-\/\%\→\←\↗\↓\©\·\:\|\-\–\—\✕\▸\•]+$/.test(text)) {
    if (!attrs.includes('data-i18n')) {
      missing.push(`<${tagName} ${attrs.trim()}> -> "${text}"`);
    }
  }
}

console.log(`Found ${missing.length} elements missing data-i18n in index.html:\n`);
missing.forEach((m) => console.log(m));
