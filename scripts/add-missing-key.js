import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const translationsDir = path.join(__dirname, '..', 'src', 'i18n', 'translations');

const translations = {
  zh: '查看项目 ↗',
  fr: 'VOIR PROJET ↗',
  en: 'VIEW PROJECT ↗',
  es: 'VER PROYECTO ↗',
  de: 'PROJEKT ANSEHEN ↗',
  it: 'VEDI PROGETTO ↗',
  pt: 'VER PROJETO ↗',
  nl: 'BEKIJK PROJECT ↗',
  ja: 'プロジェクトを見る ↗',
  ru: 'СМОТРЕТЬ ПРОЕКТ ↗',
  ar: 'عرض المشروع ↗',
  ko: '프로젝트 보기 ↗',
  pl: 'ZOBACZ PROJEKT ↗',
  sv: 'VISA PROJEKT ↗',
  da: 'SE PROJEKT ↗',
  fi: 'KATSO PROJEKTI ↗',
  no: 'SE PROSJEKT ↗',
  tr: 'PROJEYİ GÖR ↗',
  el: 'ΔΕΙΤΕ ΤΟ ΕΡΓΟ ↗',
  cs: 'ZOBRAZIT PROJEKT ↗',
  he: 'צפה בפרויקט ↗',
  th: 'ดูโปรเจกต์ ↗',
  vi: 'XEM DỰ ÁN ↗'
};

for (const [lang, value] of Object.entries(translations)) {
  const filePath = path.join(translationsDir, `${lang}.ts`);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if case_study.view_project already exists
  if (!content.includes("'case_study.view_project'")) {
    // Insert after 'case_study.visit_site'
    if (content.includes("'case_study.visit_site'")) {
      content = content.replace(
        /'case_study\.visit_site':.*?,/,
        `$& \n  'case_study.view_project': '${value}',`
      );
    } else if (content.includes('// Case Study Common Keys')) {
      content = content.replace(
        '// Case Study Common Keys',
        `// Case Study Common Keys\n  'case_study.view_project': '${value}',`
      );
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${lang}.ts with case_study.view_project = ${value}`);
  }
}
