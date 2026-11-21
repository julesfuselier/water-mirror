// POST /api/reset -> deletes the whole shower history (admin key required)

import { allowMethods, requireKey, route, sendJson } from '../lib/http.js';
import { getStore } from '../lib/store.js';

export default route(async (req, res) => {
  allowMethods(req, ['POST']);
  requireKey(req, 'ADMIN_API_KEY');
  await getStore().reset();
  return sendJson(res, 200, { status: 'success' });
});
