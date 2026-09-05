import fs from 'fs';

const tagToKey = {
  'LMS · Apprentissage · Éducation': 'work.lms.tags',
  'LMS · Learning Management System · Éducation': 'work.lms.tags',
  'UI International · Adobe Award · Finance': 'work.bnp.tags',
  'UX/UI · EduTech · Irlande': 'work.alison_lp.tags',
  'UX/UI · Prototype XD · Mobile': 'work.alison_app.tags',
  'UX/UI · Progiciel · Design System': 'work.alison_pub.tags',
  'UX Innovation · Software · LMS': 'work.alison_pub_app.tags',
  'Crédit Agricole · Figma App · UX/UI': 'work.ca.tags',
  'Trading · Application · FinTech': 'work.trading.tags',
};

const files = [
  '00-trading-230-app.html',
  '01-lms-pro.html',
  '02-bnp-motion-card.html',
  '03-alison-landing-pages.html',
  '04-alison-app.html',
  '05-alison-publishing.html',
  '06-alison-publishing-app.html',
  '07-credit-agricol-app.html',
];

files.forEach((file) => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  let updated = false;

  Object.entries(tagToKey).forEach(([tagText, key]) => {
    const targetStr = `<span class="project-card__tag">${tagText}</span>`;
    const replacementStr = `<span class="project-card__tag" data-i18n="${key}">${tagText}</span>`;
    if (content.includes(targetStr)) {
      content = content.replaceAll(targetStr, replacementStr);
      updated = true;
    }
  });

  if (updated) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
