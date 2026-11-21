// Data access for shower records.
// - Production: Postgres (Neon) through DATABASE_URL / POSTGRES_URL.
// - Local dev without a database: in-memory store seeded from db/seed-data.json.

import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export class ConfigError extends Error {}

function toRecord(row) {
  return {
    id: Number(row.id),
    user: row.user_name,
    liters: Number(row.liters),
    durationMin: Number(row.duration_min),
    deviceId: row.device_id ?? null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/* ---------------- Postgres ---------------- */

function postgresStore(url) {
  const sql = neon(url);
  let ready;
  const ensureSchema = () =>
    (ready ??= sql`
      CREATE TABLE IF NOT EXISTS showers (
        id           BIGSERIAL PRIMARY KEY,
        household_id TEXT        NOT NULL DEFAULT 'default',
        user_name    TEXT        NOT NULL,
        liters       REAL        NOT NULL CHECK (liters >= 0),
        duration_min REAL        NOT NULL CHECK (duration_min >= 0),
        device_id    TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )`.then(() => sql`
      CREATE INDEX IF NOT EXISTS showers_household_created_idx
        ON showers (household_id, created_at)`).catch((err) => {
        ready = null; // retry on next request
        throw err;
      }));

  return {
    async list({ user } = {}) {
      await ensureSchema();
      const rows = user
        ? await sql`SELECT * FROM showers WHERE lower(user_name) = lower(${user}) ORDER BY created_at, id`
        : await sql`SELECT * FROM showers ORDER BY created_at, id`;
      return rows.map(toRecord);
    },
    async add({ user, liters, durationMin, deviceId = null, createdAt = null }) {
      await ensureSchema();
      const [row] = await sql`
        INSERT INTO showers (user_name, liters, duration_min, device_id, created_at)
        VALUES (${user}, ${liters}, ${durationMin}, ${deviceId}, COALESCE(${createdAt}::timestamptz, now()))
        RETURNING *`;
      return toRecord(row);
    },
    async reset() {
      await ensureSchema();
      await sql`TRUNCATE showers RESTART IDENTITY`;
    },
  };
}

/* ---------------- In-memory (local dev only) ---------------- */

function memoryStore() {
  let rows = null;
  let nextId = 1;
  const load = async () => {
    if (rows) return;
    const seed = JSON.parse(await readFile(new URL('../db/seed-data.json', import.meta.url), 'utf8'));
    rows = seed.map((s) => ({
      id: nextId++,
      user_name: s.user,
      liters: s.liters,
      duration_min: s.durationMin,
      device_id: null,
      created_at: s.createdAt,
    }));
  };

  return {
    async list({ user } = {}) {
      await load();
      return rows
        .filter((r) => !user || r.user_name.toLowerCase() === user.toLowerCase())
        .map(toRecord);
    },
    async add({ user, liters, durationMin, deviceId = null, createdAt = null }) {
      await load();
      const row = {
        id: nextId++,
        user_name: user,
        liters,
        duration_min: durationMin,
        device_id: deviceId,
        created_at: createdAt ?? new Date().toISOString(),
      };
      rows.push(row);
      return toRecord(row);
    },
    async reset() {
      rows = [];
    },
  };
}

let store;
export function getStore() {
  if (store) return store;
  if (DB_URL) return (store = postgresStore(DB_URL));
  if (process.env.VERCEL) {
    throw new ConfigError('Database not configured: connect a Postgres (Neon) database to the Vercel project.');
  }
  return (store = memoryStore());
}
