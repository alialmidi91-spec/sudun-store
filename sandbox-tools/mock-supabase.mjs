// Sandbox-only: خادم يحاكي واجهات Supabase التي تستخدمها لوحة التحكم (Auth + PostgREST + Storage)
// حتى نختبر الواجهة بالمتصفح بدون إنترنت. يطبّق نفس قواعد الصلاحيات المكتوبة في
// supabase/migrations/001_products_admin.sql (والتي تُختبر على PostgreSQL حقيقي بـ sql-test.sh).
// Usage: node sandbox-tools/mock-supabase.mjs <seed-rows.json> [port]
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const seedFile = process.argv[2];
const PORT = +(process.argv[3] || 54321);
export const ANON = 'mock-anon-key-' + 'x'.repeat(24);
const USERS = [
  { id: '00000000-0000-0000-0000-00000000000a', email: 'admin@sudun.test', password: 'Admin-Pass-2026', admin: true },
  { id: '00000000-0000-0000-0000-00000000000b', email: 'customer@sudun.test', password: 'Customer-Pass-2026', admin: false },
];

let products, objects, tokens, refresh, log;
function reset() {
  const now = new Date().toISOString();
  products = JSON.parse(readFileSync(seedFile, 'utf8')).map((r) => ({ ...r, created_at: now, updated_at: now }));
  objects = new Map(); // path → {type, data}
  tokens = new Map(); // access → user
  refresh = new Map(); // refresh → user
  log = [];
}
reset();

const CHECK = {
  slug: (v) => typeof v === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) && v.length <= 80,
  name: (v) => typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= 120,
  category: (v) => ['rabta', 'shawl', 'ninja', 'shash'].includes(v),
  material: (v) => v === null || ['silk-lebanese', 'chiffon', 'georgette', 'organza', 'cotton', 'jafsa'].includes(v),
  price: (v) => Number.isInteger(v) && v > 0,
  stock_qty: (v) => v === null || (Number.isInteger(v) && v >= 0),
  status: (v) => v === 'published' || v === 'hidden',
};
function violates(row) {
  for (const [k, f] of Object.entries(CHECK)) if (k in row && !f(row[k])) return k;
  if (row.compare_at_price != null && !(row.compare_at_price > row.price)) return 'compare_at_price';
  if (row.offer != null && !(row.offer.quantity >= 2 && row.offer.quantity <= 20 && row.offer.price > 0)) return 'offer';
  return null;
}

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Content-Type': 'application/json',
    ...headers,
  });
  res.end(body === undefined ? '' : typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((ok) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => ok(Buffer.concat(chunks)));
  });

function who(req) {
  if (req.headers.apikey !== ANON) return { bad: true };
  const tok = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (tok === ANON) return { role: 'anon' };
  const u = tokens.get(tok);
  if (!u) return { expired: true };
  if (u.exp < Date.now()) return { expired: true };
  return { role: 'authenticated', user: u.user };
}
function issue(user) {
  const access = 'at-' + randomBytes(12).toString('hex');
  const ref = 'rt-' + randomBytes(12).toString('hex');
  const ttl = +(process.env.MOCK_TOKEN_TTL || 3600);
  tokens.set(access, { user, exp: Date.now() + ttl * 1000 });
  refresh.set(ref, user);
  return { access_token: access, refresh_token: ref, expires_in: ttl, token_type: 'bearer', user: { id: user.id, email: user.email } };
}

function filterRows(rows, params) {
  let out = rows;
  for (const [k, v] of params) {
    if (['select', 'order', 'limit'].includes(k)) continue;
    const m = /^eq\.(.*)$/.exec(v);
    if (m) out = out.filter((r) => String(r[k]) === m[1]);
  }
  return out;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') return send(res, 204);
  if (url.pathname === '/__reset') { reset(); return send(res, 200, { ok: true }); }
  if (url.pathname === '/__state') return send(res, 200, { products, objects: [...objects.keys()], log });

  // صور عامة (بدون مفتاح)
  const pub = /^\/storage\/v1\/object\/public\/product-images\/(.+)$/.exec(url.pathname);
  if (pub && req.method === 'GET') {
    const o = objects.get(decodeURIComponent(pub[1]));
    return o ? send(res, 200, o.data, { 'Content-Type': o.type }) : send(res, 404, { message: 'Object not found' });
  }

  const ctx = who(req);
  if (ctx.bad) return send(res, 401, { message: 'Invalid API key' });
  const body = await readBody(req);
  const json = () => { try { return JSON.parse(body.toString() || 'null'); } catch { return null; } };
  log.push(`${req.method} ${url.pathname}${url.search} as ${ctx.user?.email ?? ctx.role ?? 'expired'}`);

  // ---- Auth ----
  if (url.pathname === '/auth/v1/token') {
    const b = json() || {};
    if (url.searchParams.get('grant_type') === 'password') {
      const u = USERS.find((x) => x.email === b.email && x.password === b.password);
      if (!u) return send(res, 400, { code: 'invalid_credentials', msg: 'Invalid login credentials' });
      return send(res, 200, issue(u));
    }
    if (url.searchParams.get('grant_type') === 'refresh_token') {
      const u = refresh.get(b.refresh_token);
      if (!u) return send(res, 400, { code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' });
      refresh.delete(b.refresh_token);
      return send(res, 200, issue(u));
    }
  }
  if (url.pathname === '/auth/v1/logout') {
    const tok = (req.headers.authorization || '').replace(/^Bearer /, '');
    tokens.delete(tok);
    return send(res, 204);
  }
  if (ctx.expired) return send(res, 401, { code: 'PGRST301', message: 'JWT expired' });
  const isAdmin = !!ctx.user?.admin;

  // ---- PostgREST ----
  const rest = /^\/rest\/v1\/(products|admins)$/.exec(url.pathname);
  if (rest) {
    const table = rest[1];
    if (table === 'admins') {
      if (ctx.role !== 'authenticated') return send(res, 401, { code: '42501', message: 'permission denied for table admins' });
      const rows = USERS.filter((u) => u.admin && u.id === ctx.user.id).map((u) => ({ user_id: u.id }));
      return send(res, 200, filterRows(rows, url.searchParams));
    }
    const visible = products.filter((p) => p.status === 'published' || isAdmin);
    if (req.method === 'GET') return send(res, 200, filterRows(visible, url.searchParams));
    if (ctx.role !== 'authenticated') return send(res, 401, { code: '42501', message: 'permission denied for table products' });
    if (req.method === 'POST') {
      if (!isAdmin) return send(res, 403, { code: '42501', message: 'new row violates row-level security policy for table "products"' });
      const row = json();
      const bad = violates(row);
      if (bad) return send(res, 400, { code: '23514', message: `violates check constraint "products_${bad}_check"` });
      if (products.some((p) => p.slug === row.slug || p.id === row.id)) return send(res, 409, { code: '23505', message: 'duplicate key value violates unique constraint' });
      const now = new Date().toISOString();
      const saved = { ...row, created_at: now, updated_at: now };
      products.push(saved);
      return send(res, 201, [saved]);
    }
    const target = isAdmin ? filterRows(products, url.searchParams) : [];
    if (req.method === 'PATCH') {
      const patch = json();
      for (const p of target) {
        const next = { ...p, ...patch };
        const bad = violates(next);
        if (bad) return send(res, 400, { code: '23514', message: `violates check constraint "products_${bad}_check"` });
        if (products.some((o) => o !== p && o.slug === next.slug)) return send(res, 409, { code: '23505', message: 'duplicate key value' });
      }
      const out = target.map((p) => Object.assign(p, patch, { updated_at: new Date().toISOString() }));
      return send(res, 200, out);
    }
    if (req.method === 'DELETE') {
      products = products.filter((p) => !target.includes(p));
      return send(res, 200, target);
    }
  }

  // ---- Storage ----
  const up = /^\/storage\/v1\/object\/product-images\/(.+)$/.exec(url.pathname);
  if (up && req.method === 'POST') {
    if (!isAdmin) return send(res, 403, { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' });
    const type = req.headers['content-type'];
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) return send(res, 415, { statusCode: '415', message: 'mime type not supported' });
    if (body.length > 5 * 1024 * 1024) return send(res, 413, { statusCode: '413', message: 'The object exceeded the maximum allowed size' });
    const path = decodeURIComponent(up[1]);
    if (objects.has(path)) return send(res, 409, { statusCode: '409', message: 'The resource already exists' });
    objects.set(path, { type, data: body });
    return send(res, 200, { Key: `product-images/${path}` });
  }
  if (url.pathname === '/storage/v1/object/product-images' && req.method === 'DELETE') {
    if (!isAdmin) return send(res, 200, []);
    const { prefixes = [] } = json() || {};
    const gone = prefixes.filter((p) => objects.delete(p));
    return send(res, 200, gone.map((name) => ({ name })));
  }
  return send(res, 404, { message: 'not found' });
});
server.listen(PORT, () => console.log(`mock supabase on :${PORT}`));
