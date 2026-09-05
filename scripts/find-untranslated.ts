import fs from 'fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html);
const doc = dom.window.document;

function checkElement(el: Element) {
  if (['SCRIPT', 'STYLE', 'SVG', 'PATH', 'IFRAME', 'HEAD', 'META', 'LINK'].includes(el.tagName)) return;

  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 3) {
      const text = node.textContent?.trim() || '';
      if (text && text.length > 1 && !/^[0-9\s\.\,\+\-\/\%\→\←\↗\↓\©\·\:\|\-\–\—\✕\▸\•]+$/.test(text)) {
        if (!el.hasAttribute('data-i18n') && !el.closest('[data-i18n]')) {
          console.log(`[Missing data-i18n] <${el.tagName.toLowerCase()} class="${el.className}">: "${text.slice(0, 50)}..."`);
        }
      }
    }
  }

  for (const child of Array.from(el.children)) {
    checkElement(child);
  }
}

checkElement(doc.body);
