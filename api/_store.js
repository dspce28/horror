// Shared storage helpers for the story functions (Vercel Blob).
// Files in api/ that start with "_" are not exposed as endpoints.
const { put, list, del } = require('@vercel/blob');

const PENDING = 'pending/';
const PUBLISHED = 'published/';
const ID_RE = /^\d{14}-[a-f0-9]{16}$/;

async function fetchJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  return r.ok ? r.json() : null;
}

async function listAll(prefix) {
  const out = []; let cursor;
  do { const page = await list({ prefix, cursor, limit: 1000 }); out.push(...page.blobs); cursor = page.hasMore ? page.cursor : undefined; } while (cursor);
  return out;
}

// Published stories live in one JSON file. Each save gets a new name so no CDN cache can serve an old copy.
async function readPublished() {
  const blobs = (await listAll(PUBLISHED)).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  if (!blobs.length) return { stories: [], blobs };
  return { stories: (await fetchJson(blobs[0].url)) || [], blobs };
}

async function writePublished(stories, oldBlobs) {
  await put(`${PUBLISHED}stories-${Date.now()}.json`, JSON.stringify(stories), { access: 'public', addRandomSuffix: true, contentType: 'application/json' });
  if (oldBlobs.length) await del(oldBlobs.map((b) => b.url));
}

async function readPending() {
  const blobs = await listAll(PENDING);
  const items = await Promise.all(blobs.slice(0, 200).map(async (b) => ({ blob: b, story: await fetchJson(b.url) })));
  return items.filter((x) => x.story).sort((a, b) => String(b.story.id).localeCompare(String(a.story.id)));
}

async function findPending(id) {
  if (!ID_RE.test(id)) return null;
  const blobs = await listAll(`${PENDING}${id}`);
  const b = blobs.find((x) => x.pathname.startsWith(`${PENDING}${id}`));
  return b ? { blob: b, story: await fetchJson(b.url) } : null;
}

module.exports = { put, del, PENDING, ID_RE, readPublished, writePublished, readPending, findPending };
