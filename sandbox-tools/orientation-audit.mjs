// Sandbox-only: orientation/landscape audit — overlaps, sticky-bar coverage, product first screen, image sizing, RTL.
// Usage: node sandbox-tools/orientation-audit.mjs [out.json]
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://localhost:4173/#/';
const OUT = process.argv[2] || '/tmp/orientation-audit.json';
const VPS = [
  // هواتف أفقي
  { w: 568, h: 320, kind: 'هاتف صغير أفقي', touch: true, dpr: 2 },
  { w: 667, h: 375, kind: 'هاتف أفقي', touch: true, dpr: 2 },
  { w: 844, h: 390, kind: 'هاتف كبير أفقي', touch: true, dpr: 3 },
  { w: 932, h: 430, kind: 'هاتف كبير أفقي', touch: true, dpr: 3 },
  // هواتف عمودي (للمقارنة وحجم الصور)
  { w: 360, h: 780, kind: 'هاتف عمودي', touch: true, dpr: 3 },
  { w: 412, h: 915, kind: 'هاتف عمودي', touch: true, dpr: 3.5 },
  // تابلت عمودي/أفقي
  { w: 800, h: 1280, kind: 'تابلت عمودي', touch: true, dpr: 2 },
  { w: 1024, h: 1366, kind: 'تابلت كبير عمودي', touch: true, dpr: 2 },
  { w: 1180, h: 820, kind: 'تابلت أفقي', touch: true, dpr: 2 },
  { w: 1280, h: 800, kind: 'تابلت أفقي', touch: true, dpr: 2 },
  { w: 1366, h: 1024, kind: 'تابلت كبير أفقي', touch: true, dpr: 2 },
  // حدود نقاط التوقف
  { w: 599, h: 900, kind: 'حد 600', touch: true, dpr: 2 },
  { w: 899, h: 900, kind: 'حد 900', touch: true, dpr: 2 },
  { w: 900, h: 900, kind: 'حد 900', touch: false, dpr: 1 },
  { w: 960, h: 800, kind: 'لابتوب صغير', touch: false, dpr: 1 },
  { w: 1000, h: 800, kind: 'لابتوب صغير', touch: false, dpr: 1 },
  { w: 1199, h: 800, kind: 'حد 1200', touch: false, dpr: 1 },
  // شاشات عريضة
  { w: 2560, h: 1440, kind: 'مكتبي عريض', touch: false, dpr: 1 },
];
const PAGES = ['', 'shop', 'product/ninja-shawl', 'product/silk-lebanese-floral', 'cart', 'cart#filled', 'contact', 'faq'];
const CART = [
  { key: 'a', productId: 'sd-004', slug: 'ninja-shawl', name: 'x', price: 1, color: 'بيج', quantity: 3 },
  { key: 'b', productId: 'sd-001', slug: 'silk-lebanese-floral', name: 'x', price: 1, color: 'مشجر وردي وليلكي', size: '150 سم', quantity: 2 },
];

function checks({ cfgW, dpr }) {
  const vw = cfgW, vh = innerHeight;
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    if (el.closest('.visually-hidden,[hidden],.skip-link,.overlay')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const label = (el) => `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : ''} «${(el.getAttribute('aria-label') || el.textContent || el.alt || '').trim().replace(/\s+/g, ' ').slice(0, 28)}»`;
  const out = { overflow: Math.max(document.documentElement.scrollWidth, innerWidth) - vw, overlaps: [], images: [], align: [], headerOverlap: [], sticky: null };

  // 1) تداخل العناصر: أزرار/روابط/عناوين/أسعار تتقاطع مع بعض (باستثناء العناصر المتداخلة عمداً فوق الصور)
  const sel = 'main a[href], main button, main h1, main h2, main h3, main .price, main input, main select, main textarea, main label, footer a, header a, header button';
  const els = [...document.querySelectorAll(sel)].filter(vis).filter((e) => !e.closest('.card__media, .hero__visual, .pdp__main-image, .offer-card__media, .highlight__ring, .grid--rail, .quick-cats, .highlights__list'));
  // عنصر مخفي داخل حاوية تمرير خاصة به (مثل قائمة التصفية الجانبية) لا يُعتبر متداخلاً
  const clippedOut = (e) => {
    const r = e.getBoundingClientRect();
    for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) {
      const o = getComputedStyle(q).overflowY;
      if (o === 'auto' || o === 'scroll' || o === 'hidden') {
        const qr = q.getBoundingClientRect();
        if (r.bottom <= qr.top || r.top >= qr.bottom) return true;
      }
    }
    return false;
  };
  const rects = els.filter((e) => !clippedOut(e)).map((e) => [e, e.getBoundingClientRect()]);
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const [a, ra] = rects[i], [b, rb] = rects[j];
    if (a.contains(b) || b.contains(a)) continue;
    const x = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
    const y = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (x > 2 && y > 2) out.overlaps.push(`${label(a)} ⟷ ${label(b)} (${Math.round(x)}×${Math.round(y)})`);
  }
  // 2) الهيدر: هل الروابط تتداخل مع الشعار؟
  const logo = document.querySelector('.site-header .logo-link');
  if (logo && vis(logo)) {
    const rl = logo.getBoundingClientRect();
    for (const a of document.querySelectorAll('.site-header .site-nav a, .site-header .icon-btn')) {
      if (!vis(a)) continue;
      const r = a.getBoundingClientRect();
      const gap = Math.max(rl.left - r.right, r.left - rl.right);
      if (gap < 8) out.headerOverlap.push(`${label(a)} يبعد ${Math.round(gap)}px عن الشعار`);
    }
  }
  // 3) حجم الصور: هل الصورة المحمّلة أكبر بكثير أو أصغر من المطلوب؟
  for (const img of document.querySelectorAll('img')) {
    if (!vis(img) || !img.naturalWidth) continue;
    const r = img.getBoundingClientRect();
    const need = r.width * dpr;
    const ratio = img.naturalWidth / need;
    if (ratio > 2.5) out.images.push(`أكبر من الحاجة ×${ratio.toFixed(1)}: ${img.getAttribute('src')} (يُعرض ${Math.round(r.width)}px)`);
    if (ratio < 0.9 && r.width > 120) out.images.push(`أصغر من الحاجة (قد تظهر مشوشة) ×${ratio.toFixed(2)}: ${img.getAttribute('src')} (يُعرض ${Math.round(r.width)}px @${dpr}x)`);
  }
  // 4) محاذاة RTL: نصوص عربية بمحاذاة يسار فيزيائية أو اتجاه ltr غير مقصود
  for (const el of document.querySelectorAll('main p, main h1, main h2, main h3, main li, main label, main dt, main dd, footer p, footer li')) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.direction === 'ltr' && !el.closest('[dir=ltr],[lang=en]')) out.align.push('اتجاه ltr: ' + label(el));
    if (cs.textAlign === 'left' && /[؀-ۿ]/.test(el.textContent || '')) out.align.push('محاذاة يسار: ' + label(el));
  }
  return out;
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const results = [];
for (const vp of VPS) {
  const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.touch, hasTouch: vp.touch, deviceScaleFactor: vp.dpr });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  for (const route of PAGES) {
    errors.length = 0;
    const [path, flag] = route.split('#');
    await p.goto(BASE);
    await p.evaluate((c) => { localStorage.clear(); if (c) localStorage.setItem('sadan.cart.v1', JSON.stringify(c)); }, flag === 'filled' ? CART : null);
    await p.goto(BASE + path); await p.reload();
    await p.locator('main h1').first().waitFor({ timeout: 8000 });
    await p.evaluate(async () => { document.documentElement.style.scrollBehavior = 'auto'; for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } scrollTo(0, 0); });
    await p.waitForTimeout(250);
    const r = await p.evaluate(checks, { cfgW: vp.w, dpr: vp.dpr });
    // 5) مساحة الأشرطة الثابتة بمنتصف الصفحة
    await p.evaluate(() => scrollTo(0, Math.min(document.documentElement.scrollHeight - innerHeight, innerHeight * 1.5)));
    await p.waitForTimeout(450);
    r.sticky = await p.evaluate(() => {
      // نجمع المجالات العمودية المغطاة (بدون عدّ التداخل مرتين، مثل شريط يختفي جزء منه خلف الهيدر)
      const iv = []; const parts = [];
      for (const el of document.querySelectorAll('.site-header, .toolbar, .mobile-nav, .buybar.is-visible')) {
        const cs = getComputedStyle(el); if (cs.display === 'none') continue;
        if (!['fixed', 'sticky'].includes(cs.position)) continue;
        const rr = el.getBoundingClientRect();
        const a = Math.max(rr.top, 0), z = Math.min(rr.bottom, innerHeight);
        if (z > a) { iv.push([a, z]); parts.push(`${el.className.split(' ')[0]}:${Math.round(z - a)}`); }
      }
      iv.sort((x, y) => x[0] - y[0]);
      let covered = 0, end = -1;
      for (const [a, z] of iv) { if (z <= end) continue; covered += z - Math.max(a, end); end = z; }
      return { pct: Math.round((covered / innerHeight) * 100), parts: parts.join(' + ') };
    });
    // 6) أول شاشة: هل زر الشراء/السعر ظاهر بصفحة المنتج؟
    if (path.startsWith('product/')) {
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(150);
      r.firstScreen = await p.evaluate(() => {
        // ظاهر بالكامل فوق أي شريط ثابت سفلي
        const bar = document.querySelector('.buybar.is-visible');
        const barVisible = !!bar && getComputedStyle(bar).display !== 'none' && bar.getBoundingClientRect().top < innerHeight - 10;
        const limit = barVisible ? bar.getBoundingClientRect().top : innerHeight;
        const q = (s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= limit + 1; };
        return { price: q('.pdp__info .price'), addBtn: q('.pdp__actions .btn') || barVisible, buybar: barVisible };
      });
    }
    r.errors = [...errors];
    results.push({ w: vp.w, h: vp.h, kind: vp.kind, page: route || 'home', ...r });
  }
  await ctx.close();
}
await b.close();
writeFileSync(OUT, JSON.stringify(results, null, 1));
// ملخص
const agg = {};
for (const r of results) {
  const tag = `${r.w}x${r.h} ${r.kind}`;
  const add = (k, v) => ((agg[k] ??= {})[tag] ??= new Set()).add(`${r.page}: ${v}`);
  if (r.overflow > 0) add('تمرير أفقي', r.overflow + 'px');
  r.overlaps.forEach((x) => add('تداخل عناصر', x));
  r.headerOverlap.forEach((x) => add('الهيدر قريب/فوق الشعار', x));
  r.align.forEach((x) => add('محاذاة/اتجاه', x));
  r.errors.forEach((x) => add('خطأ JS', x));
  if (r.sticky.pct > 26) add('الأشرطة الثابتة تغطي أكثر من 26% من الشاشة', `${r.sticky.pct}% (${r.sticky.parts})`);
  if (r.firstScreen && (!r.firstScreen.price || !r.firstScreen.addBtn)) add('صفحة المنتج: السعر/زر الشراء خارج أول شاشة', JSON.stringify(r.firstScreen));
}
const imgs = {};
for (const r of results) for (const x of r.images) { const k = x.replace(/ \(يُعرض.*$/, '').replace(/×[\d.]+/, '×'); (imgs[k] ??= []).push(`${r.w}`); }
for (const [k, v] of Object.entries(agg)) {
  console.log(`\n## ${k}`);
  for (const [tag, set] of Object.entries(v)) console.log(`  ${tag}: ${[...set].slice(0, 4).join(' | ')}${set.size > 4 ? ` …(+${set.size - 4})` : ''}`);
}
console.log('\n## أحجام الصور (أمثلة)');
for (const [k, v] of Object.entries(imgs).slice(0, 14)) console.log(`  ${k}  @widths ${[...new Set(v)].join(',')}`);
console.log('\n## الأشرطة الثابتة (أعلى نسبة لكل مقاس)');
const maxBy = {};
for (const r of results) { const t = `${r.w}x${r.h}`; if (!maxBy[t] || r.sticky.pct > maxBy[t].pct) maxBy[t] = { ...r.sticky, page: r.page }; }
for (const [t, s] of Object.entries(maxBy)) console.log(`  ${t}: ${s.pct}% @${s.page} (${s.parts})`);
const hard = results.filter((r) => r.overflow > 0 || r.overlaps.length || r.headerOverlap.length || r.align.length || r.errors.length || r.sticky.pct > 26 || (r.firstScreen && !(r.firstScreen.price && r.firstScreen.addBtn))).length;
console.log(`\nruns: ${results.length} · runs with issues: ${hard}`);
