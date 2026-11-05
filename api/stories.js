// Receives a story from the site's form and saves it as pending.
// Nothing is published until it is approved at /admin.
const crypto = require('crypto');
const { put, PENDING } = require('./_store');

const hits = new Map(); // best-effort limit per server instance: 5 stories per hour per visitor
const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ error: 'bad_json' });
  if (b.website) return res.status(201).json({ ok: true }); // honeypot: only bots fill this

  const story = clean(b.story, 3000);
  if ([...story].length < 40) return res.status(422).json({ error: 'too_short' });
  const kind = ['prank', 'real', 'heard'].includes(b.kind) ? b.kind : 'heard';
  const lang = ['en', 'hi', 'gu'].includes(b.lang) ? b.lang : 'en';

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const key = crypto.createHash('sha256').update(ip + '|' + new Date().toISOString().slice(0, 10)).digest('hex').slice(0, 32);
  const now = Date.now(), recent = (hits.get(key) || []).filter((t) => t > now - 3600e3);
  if (recent.length >= 5) return res.status(429).json({ error: 'rate' });
  recent.push(now); hits.set(key, recent);

  const id = new Date().toISOString().replace(/\D/g, '').slice(0, 14) + '-' + crypto.randomBytes(8).toString('hex');
  const record = { id, name: clean(b.name, 40), city: clean(b.city, 40), kind, lang, story, received: new Date().toISOString() };
  try {
    await put(`${PENDING}${id}.json`, JSON.stringify(record), { access: 'public', addRandomSuffix: true, contentType: 'application/json' });
  } catch (e) {
    console.error('store failed', e && e.message);
    return res.status(500).json({ error: 'store' });
  }
  return res.status(201).json({ ok: true });
};
