// Imports db/seed-data.json (the history from the old donnees.json).
//
//   npm run seed -- --remote https://water-mirror.vercel.app
//       sends each shower to the live API (uses DEVICE_API_KEY from .env.local)
//   npm run seed
//       writes straight into Postgres (needs DATABASE_URL), only if the table is empty
//   npm run seed -- --force
//       same, but wipes the table first

import { readFile } from 'node:fs/promises';

const seed = JSON.parse(await readFile(new URL('../db/seed-data.json', import.meta.url), 'utf8'));
const args = process.argv.slice(2);
const remote = args.includes('--remote') ? args[args.indexOf('--remote') + 1] : null;

if (remote) {
  const key = process.env.DEVICE_API_KEY;
  if (!key) {
    console.error('DEVICE_API_KEY is missing from .env.local.');
    process.exit(1);
  }
  const existing = await (await fetch(`${remote}/api/showers`)).json();
  if (existing.length && !args.includes('--force')) {
    console.error(`The live database already holds ${existing.length} showers. Use --force to add the demo data anyway.`);
    process.exit(1);
  }
  let done = 0;
  for (const shower of seed) {
    const res = await fetch(`${remote}/api/showers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key },
      body: JSON.stringify({ ...shower, duration: shower.durationMin }),
    });
    if (!res.ok) {
      console.error(`Failed on shower ${done + 1}:`, await res.text());
      process.exit(1);
    }
    process.stdout.write(`\rImported ${++done}/${seed.length}`);
  }
  console.log('\nDone.');
  process.exit(0);
}

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  console.error('DATABASE_URL is missing. Use --remote <url>, or add DATABASE_URL to .env.local.');
  process.exit(1);
}

const { getStore } = await import('../lib/store.js');
const store = getStore();
const force = args.includes('--force');
const existing = await store.list();
if (existing.length && !force) {
  console.error(`The table already holds ${existing.length} showers. Use --force to wipe it first.`);
  process.exit(1);
}
if (force) await store.reset();
for (const s of seed) await store.add(s);
console.log(`Imported ${seed.length} showers.`);
