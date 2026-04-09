/**
 * One-off migration: point all industry landing CTAs to /join.
 * Run: node scripts/migrate-industry-ctas-to-join.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDUSTRIES_DIR = path.join(__dirname, '..', 'data', 'industries');

if (!fs.existsSync(INDUSTRIES_DIR)) {
  console.error('Missing industries dir:', INDUSTRIES_DIR);
  process.exit(1);
}

const files = fs.readdirSync(INDUSTRIES_DIR).filter((f) => f.endsWith('.json'));
let updated = 0;

for (const file of files) {
  const filePath = path.join(INDUSTRIES_DIR, file);
  const raw = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(raw);

  let changed = false;

  if (json?.hero?.cta?.href && json.hero.cta.href !== '/join') {
    json.hero.cta.href = '/join';
    changed = true;
  }

  if (json?.finalCta?.buttonHref && json.finalCta.buttonHref !== '/join') {
    json.finalCta.buttonHref = '/join';
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
    updated += 1;
  }
}

console.log(`Updated ${updated}/${files.length} industry JSON files to /join.`);

