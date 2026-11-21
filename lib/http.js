// Small helpers shared by the API routes (work on Vercel and in scripts/dev-server.js).

import { timingSafeEqual } from 'node:crypto';
import { ConfigError } from './store.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export function getQuery(req) {
  return Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
}

/** Reads a JSON or form-encoded body. Vercel may have parsed it already (req.body). */
export async function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  let raw = req.body;
  if (raw === undefined) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    raw = Buffer.concat(chunks).toString('utf8');
  }
  if (Buffer.isBuffer(raw)) raw = raw.toString('utf8');
  if (raw && typeof raw === 'object') return raw;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return Object.fromEntries(new URLSearchParams(raw));
  }
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Checks the key sent in the `x-api-key` header or `?key=` query param.
 * Without the env var: allowed in local dev, refused on Vercel.
 */
export function requireKey(req, envName) {
  const expected = process.env[envName];
  if (!expected) {
    if (process.env.VERCEL) throw new ConfigError(`${envName} is not configured on the server.`);
    return;
  }
  const given = req.headers['x-api-key'] || getQuery(req).key;
  if (!given || !safeEqual(given, expected)) throw new HttpError(401, 'Invalid or missing API key.');
}

export function allowMethods(req, methods) {
  if (!methods.includes(req.method)) throw new HttpError(405, `Method ${req.method} not allowed.`);
}

/** Wraps a route handler with uniform error responses. */
export function route(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (err instanceof HttpError) return sendJson(res, err.status, { error: err.message });
      if (err instanceof ConfigError) return sendJson(res, 503, { error: err.message });
      console.error(err);
      return sendJson(res, 500, { error: 'Internal server error.' });
    }
  };
}
