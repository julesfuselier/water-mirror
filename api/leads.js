// POST   /api/leads                       -> enregistre un contact du calculateur (public)
// GET    /api/leads[?format=csv]          -> liste / export CSV des contacts (clé admin)
// DELETE /api/leads?email=x@y.fr          -> supprime un contact, pour les demandes RGPD (clé admin)

import { allowMethods, getQuery, HttpError, readBody, requireKey, route, sendJson } from '../lib/http.js';
import { getLeads, leadsToCsv, parseLead } from '../lib/leads.js';

export default route(async (req, res) => {
  allowMethods(req, ['GET', 'POST', 'DELETE']);
  const leads = getLeads();

  if (req.method === 'POST') {
    const lead = parseLead(await readBody(req));
    if (lead.spam) return sendJson(res, 201, { status: 'success' });
    await leads.upsert(lead);
    return sendJson(res, 201, { status: 'success' });
  }

  requireKey(req, 'ADMIN_API_KEY');
  const query = getQuery(req);

  if (req.method === 'DELETE') {
    const email = String(query.email ?? '').trim().toLowerCase();
    if (!email) throw new HttpError(400, '`email` is required.');
    return sendJson(res, 200, { deleted: await leads.remove(email) });
  }

  const list = await leads.list();
  if (query.format === 'csv') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="water-mirror-contacts-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.end(leadsToCsv(list));
  }
  return sendJson(res, 200, { count: list.length, leads: list });
});
