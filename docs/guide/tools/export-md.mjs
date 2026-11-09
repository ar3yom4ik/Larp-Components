#!/usr/bin/env node
/* Export the whole guide as flat Markdown: GUIDE.en.md and GUIDE.ru.md.
   Usage: node tools/export-md.mjs   (run from docs/guide/) */
import { parts, meta } from '../src/content/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..');

function clean(md) {
  return md
    .replace(/^~~~/gm, '```')          // fences: our renderer accepts both
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

for (const lang of ['en', 'ru']) {
  const L = [];
  L.push(`# ${meta.docTitle[lang]}`);
  L.push('');
  L.push(`> ${meta.subtitle[lang]}`);
  L.push('');
  L.push(meta.hero.text[lang]);
  L.push('');
  L.push('---');
  L.push('');
  L.push('## Contents');
  L.push('');
  for (const p of parts) {
    L.push(`- **Part ${p.num} — ${p.title[lang]}**`);
    for (const s of p.sections) L.push(`  - ${s.title[lang]}`);
  }
  L.push('');
  for (const p of parts) {
    L.push('---');
    L.push('');
    L.push(`# Part ${p.num} — ${p.title[lang]}`);
    L.push('');
    L.push(`_${p.sub[lang]}_`);
    L.push('');
    for (const s of p.sections) {
      L.push(`## ${s.title[lang]}`);
      L.push('');
      L.push(clean(s.body[lang]));
      L.push('');
    }
  }
  const file = path.join(out, `GUIDE.${lang}.md`);
  fs.writeFileSync(file, L.join('\n'), 'utf-8');
  console.log('wrote', file, fs.statSync(file).size, 'bytes');
}
