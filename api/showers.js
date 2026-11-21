// GET  /api/showers[?user=Alex]  -> list of showers (oldest first)
// POST /api/showers              -> add a shower { user, liters, duration } (device key required)

import { allowMethods, getQuery, readBody, requireKey, route, sendJson } from '../lib/http.js';
import { parseShower } from '../lib/showers.js';
import { getStore } from '../lib/store.js';

export default route(async (req, res) => {
  allowMethods(req, ['GET', 'POST']);
  const store = getStore();

  if (req.method === 'GET') {
    const { user } = getQuery(req);
    return sendJson(res, 200, await store.list({ user }));
  }

  requireKey(req, 'DEVICE_API_KEY');
  const shower = await store.add(parseShower(await readBody(req)));
  return sendJson(res, 201, shower);
});
