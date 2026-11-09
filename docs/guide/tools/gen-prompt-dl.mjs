#!/usr/bin/env node
/* Publish FACTORY_PROMPT (src/content/07-prompt.js) as a standalone download.
   Usage: node tools/gen-prompt-dl.mjs   (run from docs/guide/) */
import { FACTORY_PROMPT } from '../src/content/07-prompt.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'assets', 'dl', 'visualcomponents-factory-prompt.md');
fs.writeFileSync(out, FACTORY_PROMPT.trim() + '\n', 'utf-8');
console.log('wrote', out, fs.statSync(out).size, 'bytes');
