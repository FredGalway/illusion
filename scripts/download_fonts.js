import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.join(__dirname, '..', 'public', 'fonts', 'inter');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const weights = ['100', '200', '300', '400', '500', '600', '700', '800', '900'];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: status ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function main() {
  console.log('Downloading Inter font files...');
  for (const w of weights) {
    const url = `https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-${w}-normal.woff2`;
    const dest = path.join(outDir, `inter-latin-${w}.woff2`);
    console.log(`Downloading weight ${w}...`);
    await download(url, dest);
  }

  try {
    const varUrl = `https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-variable-full-normal.woff2`;
    const varDest = path.join(outDir, `inter-latin-var.woff2`);
    console.log('Downloading variable font...');
    await download(varUrl, varDest);
  } catch (err) {
    console.log('Variable font skipped:', err.message);
  }

  console.log('Successfully downloaded all Inter font files!');
}

main().catch(console.error);
