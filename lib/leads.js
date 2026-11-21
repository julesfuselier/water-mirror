// Contacts collected by the /calculateur page (prospects to re-contact).
// - Production: Postgres (Neon), table `leads`, created on first call.
// - Local dev without a database: in-memory list (lost on restart).
// One row per email: submitting again updates the row instead of duplicating it.

import { neon } from '@neondatabase/serverless';
import { HttpError } from './http.js';
import { ConfigError } from './store.js';

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export const PROFILES = ['student_residence', 'flatshare', 'family', 'manager', 'other'];
export const INTERESTS = ['launch', 'pilot', 'partner'];
const CONSENT_VERSION = 'v1-2026-11';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clip = (value, max) => String(value ?? '').trim().slice(0, max);

/** Validates the form payload. Throws HttpError(400) on bad input. */
export function parseLead(input) {
  // Honeypot: a hidden field humans never fill. Bots get a fake success (see api/leads.js).
  if (clip(input.website, 200)) return { spam: true };

  const email = clip(input.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Adresse e-mail invalide.');

  const consent = input.consent === true || input.consent === 'true' || input.consent === 'on';
  if (!consent) throw new HttpError(400, 'Le consentement est obligatoire pour être recontacté.');

  const profile = PROFILES.includes(input.profile) ? input.profile : 'other';
  const interests = (Array.isArray(input.interests) ? input.interests : [input.interests])
    .filter((i) => INTERESTS.includes(i));

  // Calculator answers and results: small numeric object, kept for segmentation.
  const calc = {};
  if (input.calc && typeof input.calc === 'object') {
    for (const [key, value] of Object.entries(input.calc).slice(0, 20)) {
      if (typeof value === 'number' && Number.isFinite(value)) calc[clip(key, 30)] = Math.round(value * 100) / 100;
      else if (typeof value === 'string') calc[clip(key, 30)] = clip(value, 30);
    }
  }

  return {
    email,
    firstName: clip(input.firstName, 60) || null,
    city: clip(input.city, 80) || null,
    profile,
    interests,
    calc,
    source: clip(input.source, 60) || null,
    medium: clip(input.medium, 60) || null,
    campaign: clip(input.campaign, 80) || null,
    referrer: clip(input.referrer, 200) || null,
    consentVersion: CONSENT_VERSION,
  };
}

function toRecord(row) {
  return {
    email: row.email,
    firstName: row.first_name,
    city: row.city,
    profile: row.profile,
    interests: row.interests ?? [],
    calc: row.calc ?? {},
    source: row.source,
    medium: row.medium,
    campaign: row.campaign,
    referrer: row.referrer,
    consentVersion: row.consent_version,
    consentAt: new Date(row.consent_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function postgresLeads(url) {
  const sql = neon(url);
  let ready;
  const ensureSchema = () =>
    (ready ??= sql`
      CREATE TABLE IF NOT EXISTS leads (
        id              BIGSERIAL PRIMARY KEY,
        email           TEXT        NOT NULL UNIQUE,
        first_name      TEXT,
        city            TEXT,
        profile         TEXT        NOT NULL DEFAULT 'other',
        interests       TEXT[]      NOT NULL DEFAULT '{}',
        calc            JSONB       NOT NULL DEFAULT '{}',
        source          TEXT,
        medium          TEXT,
        campaign        TEXT,
        referrer        TEXT,
        consent_version TEXT        NOT NULL,
        consent_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      )`.catch((err) => {
        ready = null;
        throw err;
      }));

  return {
    async upsert(lead) {
      await ensureSchema();
      const [row] = await sql`
        INSERT INTO leads (email, first_name, city, profile, interests, calc, source, medium, campaign, referrer, consent_version)
        VALUES (${lead.email}, ${lead.firstName}, ${lead.city}, ${lead.profile}, ${lead.interests},
                ${JSON.stringify(lead.calc)}::jsonb, ${lead.source}, ${lead.medium}, ${lead.campaign}, ${lead.referrer},
                ${lead.consentVersion})
        ON CONFLICT (email) DO UPDATE SET
          first_name      = COALESCE(EXCLUDED.first_name, leads.first_name),
          city            = COALESCE(EXCLUDED.city, leads.city),
          profile         = EXCLUDED.profile,
          interests       = ARRAY(SELECT DISTINCT unnest(leads.interests || EXCLUDED.interests)),
          calc            = CASE WHEN EXCLUDED.calc = '{}'::jsonb THEN leads.calc ELSE EXCLUDED.calc END,
          consent_version = EXCLUDED.consent_version,
          consent_at      = now(),
          updated_at      = now()
        RETURNING *`;
      return toRecord(row);
    },
    async list() {
      await ensureSchema();
      return (await sql`SELECT * FROM leads ORDER BY created_at DESC`).map(toRecord);
    },
    async remove(email) {
      await ensureSchema();
      const rows = await sql`DELETE FROM leads WHERE email = ${email} RETURNING id`;
      return rows.length > 0;
    },
  };
}

function memoryLeads() {
  const rows = new Map();
  return {
    async upsert(lead) {
      const now = new Date().toISOString();
      const old = rows.get(lead.email);
      const row = {
        email: lead.email,
        first_name: lead.firstName ?? old?.first_name ?? null,
        city: lead.city ?? old?.city ?? null,
        profile: lead.profile,
        interests: [...new Set([...(old?.interests ?? []), ...lead.interests])],
        calc: Object.keys(lead.calc).length ? lead.calc : (old?.calc ?? {}),
        source: old?.source ?? lead.source,
        medium: old?.medium ?? lead.medium,
        campaign: old?.campaign ?? lead.campaign,
        referrer: old?.referrer ?? lead.referrer,
        consent_version: lead.consentVersion,
        consent_at: now,
        created_at: old?.created_at ?? now,
        updated_at: now,
      };
      rows.set(lead.email, row);
      return toRecord(row);
    },
    async list() {
      return [...rows.values()].reverse().map(toRecord);
    },
    async remove(email) {
      return rows.delete(email);
    },
  };
}

let leads;
export function getLeads() {
  if (leads) return leads;
  if (DB_URL) return (leads = postgresLeads(DB_URL));
  if (process.env.VERCEL) {
    throw new ConfigError('Database not configured: connect a Postgres (Neon) database to the Vercel project.');
  }
  return (leads = memoryLeads());
}

/** CSV export (separator ";" so it opens directly in a French Excel). */
export function leadsToCsv(list) {
  const cols = ['email', 'firstName', 'city', 'profile', 'interests', 'source', 'medium', 'campaign',
    'minutes', 'people', 'yearEur', 'consentVersion', 'consentAt', 'createdAt'];
  const cell = (v) => {
    let s = Array.isArray(v) ? v.join('|') : String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = `'${s}`; // avoid formula injection in spreadsheets
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = list.map((l) => cols.map((c) => cell(l[c] ?? l.calc?.[c])).join(';'));
  return `﻿${cols.join(';')}\n${lines.join('\n')}\n`;
}
