// Legacy ESP32 endpoint, kept compatible with the old Flask route:
//   GET  /update?user=Alex&liters=12.5&duration=3m10s&key=...
//   POST /update  { "user": "Alex", "liters": 12.5, "duration": "3m10s" }  (header x-api-key)
// (/update is rewritten to /api/update in vercel.json)

import { allowMethods, getQuery, readBody, requireKey, route, sendJson } from '../lib/http.js';
import { parseShower } from '../lib/showers.js';
import { getStore } from '../lib/store.js';

export default route(async (req, res) => {
  allowMethods(req, ['GET', 'POST']);
  requireKey(req, 'DEVICE_API_KEY');

  const input = req.method === 'GET' ? getQuery(req) : { ...getQuery(req), ...(await readBody(req)) };
  const shower = await getStore().add(parseShower(input));

  console.log(`[ESP32] shower saved: ${shower.user} (${shower.liters} L)`);
  return sendJson(res, 200, { status: 'success', shower });
});
