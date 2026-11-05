// Private page to publish or delete submitted stories. Password comes from the ADMIN_PASSWORD environment variable.
const crypto = require('crypto');
const { del, ID_RE, readPublished, writePublished, readPending, findPending } = require('./_store');

const PW = process.env.ADMIN_PASSWORD || '';
const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sign = (v) => crypto.createHmac('sha256', 'admin-session|' + PW).update(v).digest('hex');
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

function cookie(req, name) { const m = String(req.headers.cookie || '').match(new RegExp('(?:^|; )' + name + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; }
function authed(req) {
  if (!PW) return false;
  const [exp, mac] = cookie(req, 'adm').split('.');
  return !!exp && !!mac && Number(exp) > Date.now() && safeEq(mac, sign(exp));
}
function back(res, msg) { res.statusCode = 303; res.setHeader('Location', '/admin' + (msg ? '?m=' + encodeURIComponent(msg) : '')); res.end(); }

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'");

  if (req.method === 'POST') {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    if (req.headers.origin !== `https://${host}` && req.headers.origin !== `http://${host}`) { res.statusCode = 403; return res.end('Blocked: wrong origin.'); }
    const b = typeof req.body === 'object' && req.body ? req.body : Object.fromEntries(new URLSearchParams(String(req.body || '')));
    const action = String(b.action || '');
    if (action === 'login') {
      if (PW && safeEq(b.password || '', PW)) {
        const exp = String(Date.now() + 12 * 3600e3);
        res.setHeader('Set-Cookie', `adm=${exp}.${sign(exp)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`);
        return back(res);
      }
      await new Promise((r) => setTimeout(r, 1500));
      return back(res, 'Wrong password.');
    }
    if (action === 'logout') { res.setHeader('Set-Cookie', 'adm=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'); return back(res); }
    if (!authed(req)) return back(res, 'Please log in.');
    const id = String(b.id || '');
    if (!ID_RE.test(id)) return back(res, 'Unknown story.');
    try {
      if (action === 'approve') {
        const p = await findPending(id); if (!p || !p.story) return back(res, 'That story is no longer pending.');
        const { stories, blobs } = await readPublished();
        const s = p.story;
        await writePublished([{ id, kind: s.kind, name: s.name, city: s.city, story: s.story, lang: s.lang }, ...stories.filter((x) => x.id !== id)], blobs);
        await del(p.blob.url);
        return back(res, 'Published.');
      }
      if (action === 'reject') { const p = await findPending(id); if (p) await del(p.blob.url); return back(res, 'Deleted.'); }
      if (action === 'unpublish') { const { stories, blobs } = await readPublished(); await writePublished(stories.filter((x) => x.id !== id), blobs); return back(res, 'Removed from the site.'); }
    } catch (e) { console.error('admin action failed', e && e.message); return back(res, 'Something went wrong. Try again.'); }
    return back(res);
  }

  const msg = new URL(req.url, 'http://x').searchParams.get('m') || '';
  let body = '';
  if (!PW) body = '<div class="card">ADMIN_PASSWORD is not set in the Vercel project settings.</div>';
  else if (!authed(req)) body = `<form method="post" class="card"><input type="hidden" name="action" value="login"><label>Password <input type="password" name="password" required autofocus></label><div><button class="ok">Log in</button></div></form>`;
  else {
    const [pending, pub] = await Promise.all([readPending(), readPublished()]);
    const meta = (s) => `${h(String(s.kind || '').toUpperCase())} · ${h(s.name || 'Anonymous')}${s.city ? ' · ' + h(s.city) : ''}${s.lang ? ' · ' + h(s.lang) : ''}`;
    const btn = (id, action, label, cls) => `<form method="post"><input type="hidden" name="id" value="${h(id)}"><input type="hidden" name="action" value="${action}"><button class="${cls}">${label}</button></form>`;
    body = `<form method="post"><input type="hidden" name="action" value="logout"><button class="plain">Log out</button></form>
      <h2>Waiting for you (${pending.length})</h2>${pending.length ? '' : '<p class="meta">No new stories.</p>'}
      ${pending.map(({ story: s }) => `<div class="card"><div class="meta">${meta(s)} · ${h(s.received)}</div><div class="story">${h(s.story)}</div><div class="row">${btn(s.id, 'approve', 'Publish', 'ok')}${btn(s.id, 'reject', 'Delete', 'no')}</div></div>`).join('')}
      <h2>On the site (${pub.stories.length})</h2>
      ${pub.stories.map((s) => `<div class="card"><div class="meta">${meta(s)}</div><div class="story">${h(s.story)}</div>${btn(s.id, 'unpublish', 'Remove from site', 'no')}</div>`).join('')}`;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Stories admin</title><style>
body{font:15px/1.55 system-ui,sans-serif;background:#0b090d;color:#eee6d8;margin:0;padding:24px 16px}main{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
h1{margin:0;font-size:24px}h2{margin:18px 0 0;font-size:18px;color:#f2c230}.card{background:#16121a;border:1px solid #2c2530;border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:8px}
.meta{font-size:13px;color:#9a90a3}.story{white-space:pre-line}.row{display:flex;gap:8px;flex-wrap:wrap}form{margin:0}button{font:inherit;border:0;border-radius:6px;padding:7px 14px;cursor:pointer}
.ok{background:#3ddc6f;color:#04210e}.no{background:#3a2a30;color:#ffb4b4}.plain{background:#2c2530;color:#eee6d8}input{font:inherit;padding:8px 10px;border-radius:6px;border:1px solid #3a3040;background:#000;color:#eee}.msg{color:#f2c230}
</style></head><body><main><h1>Ghost stories: admin</h1>${msg ? `<p class="msg">${h(msg)}</p>` : ''}${body}</main></body></html>`);
};
