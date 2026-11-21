// Imports db/seed-data.json (the history from the old donnees.json) into Postgres.
// Usage: npm run seed            (only if the table is empty)
//        npm run seed -- --force (wipes the table first)

import { readFile } from 'node:fs/promises';
import { getStore } from '../lib/store.js';

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  console.error('DATABASE_URL is missing. Run `npx vercel env pull .env.local` first.');
  process.exit(1);
}

const store = getStore();
const force = process.argv.includes('--force');
const existing = await store.list();

if (existing.length && !force) {
  console.error(`The table already holds ${existing.length} showers. Use --force to wipe it first.`);
  process.exit(1);
}
if (force) await store.reset();

const seed = JSON.parse(await readFile(new URL('../db/seed-data.json', import.meta.url), 'utf8'));
for (const s of seed) await store.add(s);
console.log(`Imported ${seed.length} showers.`);
