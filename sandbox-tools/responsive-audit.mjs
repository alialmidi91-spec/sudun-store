// Sandbox-only: automated responsive audit across viewport sizes and all pages.
// Usage: node sandbox-tools/responsive-audit.mjs [--quick] [--out=report.json]
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://localhost:4173/#/';
const args = process.argv.slice(2);
const outArg = args.find((a) => a.startsWith('--out='));

export const VIEWPORTS = [
  { w: 320, h: 568, kind: 'موبايل صغير' },
  { w: 360, h: 740, kind: 'موبايل صغير' },
  { w: 375, h: 667, kind: 'موبايل' },
  { w: 390, h: 844, kind: 'موبايل' },
  { w: 414, h: 896, kind: 'موبايل' },
  { w: 430, h: 932, kind: 'موبايل' },
  { w: 600, h: 960, kind: 'تابلت' },
  { w: 768, h: 1024, kind: 'تابلت' },
  { w: 820, h: 1180, kind: 'تابلت' },
  { w: 1024, h: 768, kind: 'تابلت' },
  { w: 1280, h: 800, kind: 'لابتوب' },
  { w: 1366, h: 768, kind: 'لابتوب' },
  { w: 1440, h: 900, kind: 'لابتوب' },
  { w: 1920, h: 1080, kind: 'مكتبي' },
];

const CART = [
  { key: 'a', productId: 'sd-004', slug: 'ninja-shawl', name: 'x', price: 1, color: 'بيج', quantity: 3 },
  { key: 'b', productId: 'sd-001', slug: 'silk-lebanese-floral', name: 'x', price: 1, color: 'مشجر وردي وليلكي', size: '150 سم', quantity: 2 },
  { key: 'c', productId: 'sd-006', slug: 'cotton-shawl', name: 'x', price: 1, color: 'رخامي رمادي', quantity: 1 },
];

export const PAGES = [
  { id: 'home', route: '' },
  { id: 'shop', route: 'shop' },
  { id: 'search', route: 'shop?q=%D8%B4%D9%8A%D9%81%D9%88%D9%86' },
  { id: 'search-empty', route: 'shop?q=zzzz' },
  { id: 'filter', route: 'shop?material=chiffon,cotton&sort=price-asc' },
  { id: 'offers', route: 'shop?offers=1' },
  ...['silk-lebanese-floral', 'chiffon-rabta-floral', 'georgette-ninja-shawl', 'ninja-shawl', 'organza-curly-shawl', 'cotton-shawl', 'jafsa-shash'].map((s) => ({ id: 'product:' + s, route: 'product/' + s })),
  { id: 'cart-empty', route: 'cart' },
  { id: 'cart', route: 'cart', cart: true },
  { id: 'about', route: 'about' },
  { id: 'contact', route: 'contact' },
  { id: 'delivery', route: 'delivery' },
  { id: 'returns', route: 'returns' },
  { id: 'faq', route: 'faq' },
  { id: '404', route: 'no-such-page' },
  { id: 'product-404', route: 'product/no-such-product' },
];

/** Runs inside the page: returns findings for the current viewport state. */
function pageChecks({ touch, insets, cfgW }) {
  // نقارن بعرض الشاشة الحقيقي: بمحاكاة الموبايل يتوسع innerWidth إذا كانت الصفحة أعرض
  const vw = cfgW;
  const vh = innerHeight;
  const out = { overflowX: 0, offscreen: [], clipped: [], smallTargets: [], tinyTargets: [], smallText: [], distorted: [], unsafe: [], h1: 0, dir: '', cardsPerRow: null, mobileNav: false, buybar: false, hamburger: false, desktopNav: false };
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    if (el.closest('.visually-hidden,[hidden],.skip-link')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const scrollerAncestor = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return p;
    }
    return null;
  };
  const name = (el) => {
    const t = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('alt') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''} «${t}»`;
  };

  out.overflowX = Math.max(document.documentElement.scrollWidth, innerWidth) - vw;
  out.layoutViewport = innerWidth;
  out.h1 = [...document.querySelectorAll('h1')].filter(vis).length;
  out.dir = getComputedStyle(document.body).direction;

  const all = [...document.querySelectorAll('body *')];
  for (const el of all) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // 1) عناصر خارج الشاشة أفقياً (غير داخل حاوية تمرير/قص مقصودة)
    if ((r.right > vw + 1 || r.left < -1) && !scrollerAncestor(el) && cs.position !== 'fixed') {
      if (!el.closest('[aria-hidden="true"]')) out.offscreen.push(name(el) + ` [${Math.round(r.left)}→${Math.round(r.right)}]`);
    }
    // 2) نص مقصوص داخل الأزرار والروابط والعناوين والخلايا
    if (/^(BUTTON|A|LABEL|H1|H2|H3|DT|DD|P|SPAN|STRONG|SMALL|OUTPUT|SELECT|INPUT)$/.test(el.tagName)) {
      const clipsX = ['hidden', 'clip'].includes(cs.overflowX) && cs.textOverflow !== 'ellipsis';
      if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && (clipsX || el.tagName === 'BUTTON' || el.classList.contains('btn'))) {
        out.clipped.push(name(el) + ` [${el.clientWidth}<${el.scrollWidth}]`);
      }
    }
    // 3) صور مشوّهة
    if (el.tagName === 'IMG' && el.naturalWidth && cs.objectFit === 'fill') {
      const ratio = r.width / r.height;
      const nat = el.naturalWidth / el.naturalHeight;
      if (Math.abs(ratio - nat) / nat > 0.03) out.distorted.push(name(el) + ` ${ratio.toFixed(2)} vs ${nat.toFixed(2)}`);
    }
  }

  // 4) أحجام اللمس
  const interactive = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role="button"], [role="tab"]')];
  for (const el of interactive) {
    if (!vis(el)) continue;
    if (el.closest('.overlay')) continue;
    let target = el;
    if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) target = el.closest('label') || el;
    const r = target.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // روابط داخل فقرة نصية مستثناة (WCAG 2.5.8)
    const inlineInText = cs.display === 'inline' && el.parentElement && /^(P|LI|SPAN|DD)$/.test(el.parentElement.tagName) && el.parentElement.textContent.trim().length > el.textContent.trim().length + 3;
    if (inlineInText) continue;
    // استثناء WCAG 2.5.8: يوجد هدف مكافئ كبير لنفس الرابط داخل نفس البطاقة (مثل صورة المنتج)
    const href = el.getAttribute('href');
    const box = el.closest('.card, .cart-line, li');
    if (href && box && [...box.querySelectorAll('a[href]')].some((o) => o !== el && o.getAttribute('href') === href && Math.min(o.getBoundingClientRect().width, o.getBoundingClientRect().height) >= 44)) continue;
    const min = Math.min(r.width, r.height);
    if (min < 24) out.tinyTargets.push(name(el) + ` ${Math.round(r.width)}×${Math.round(r.height)}`);
    else if (touch && min < 40) out.smallTargets.push(name(el) + ` ${Math.round(r.width)}×${Math.round(r.height)}`);
  }

  // 5) خطوط صغيرة جداً
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || !n.textContent.trim() || !vis(el) || seen.has(el)) continue;
    seen.add(el);
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 11.5) out.smallText.push(name(el) + ` ${fs.toFixed(1)}px`);
  }

  // 6) Safe areas: العناصر التفاعلية الثابتة يجب أن تكون داخل المنطقة الآمنة
  if (insets) {
    const fixedRoots = [...document.querySelectorAll('.mobile-nav, .buybar.is-visible, .site-header, .toast-region, .announcement')].filter(vis);
    for (const root of fixedRoots) {
      for (const el of [root, ...root.querySelectorAll('a, button, img, p, span, strong')]) {
        if (!vis(el) || (el !== root && el.children.length && el.tagName !== 'A' && el.tagName !== 'BUTTON')) continue;
        if (el === root && !/^(A|BUTTON)$/.test(el.tagName)) continue;
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        const bad = r.left < insets.left - 1 || r.right > vw - insets.right + 1 || r.top < insets.top - 1 || r.bottom > vh - insets.bottom + 1;
        if (bad) out.unsafe.push(name(el) + ` [${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)}]`);
      }
    }
    // المحتوى الأساسي أفقياً (الوضع الأفقي): النصوص والأزرار خارج الحاويات القابلة للتمرير
    if (insets.left || insets.right) {
      for (const el of document.querySelectorAll('main h1, main h2, main p, main .btn, main a, main input, main select, footer a, footer p')) {
        if (!vis(el) || scrollerAncestor(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        if (r.left < insets.left - 1 || r.right > vw - insets.right + 1) out.unsafe.push(name(el) + ` [x ${Math.round(r.left)}→${Math.round(r.right)}]`);
      }
    }
  }

  const visEl = (sel) => { const e = document.querySelector(sel); return !!e && vis(e); };
  out.mobileNav = visEl('.mobile-nav');
  out.buybar = !!document.querySelector('.buybar') && getComputedStyle(document.querySelector('.buybar')).display !== 'none';
  out.hamburger = visEl('.site-header [aria-label="فتح القائمة"]');
  out.desktopNav = visEl('.site-header .site-nav');
  const cards = [...document.querySelectorAll('main .grid:not(.grid--rail) .card')].filter(vis);
  if (cards.length) {
    const top = cards[0].getBoundingClientRect().top;
    out.cardsPerRow = cards.filter((c) => Math.abs(c.getBoundingClientRect().top - top) < 4).length;
  }
  return out;
}

async function scrollThrough(p) {
  await p.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(300, innerHeight * 0.8)) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    scrollTo(0, 0);
  });
  await p.waitForTimeout(250);
}

export async function audit({ viewports = VIEWPORTS, pages = PAGES, textScale = null, insets = null, landscape = false } = {}) {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const results = [];
  for (const vp of viewports) {
    const touch = vp.w <= 1024;
    const w = landscape ? vp.h : vp.w;
    const h = landscape ? vp.w : vp.h;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch, locale: 'ar-IQ' });
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => m.type() === 'error' && !/ERR_TUNNEL|fonts\.g/.test(m.text()) && errors.push(m.text()));
    if (textScale) {
      // يحاكي إعداد حجم الخط بالمتصفح من أول تحميل للصفحة
      await p.addInitScript((sc) => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = `html{font-size:${sc}%!important}`; document.head.appendChild(st); }), textScale);
    }
    if (insets) {
      const cdp = await ctx.newCDPSession(p);
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { ...insets, topMax: insets.top, bottomMax: insets.bottom, leftMax: insets.left, rightMax: insets.right } });
    }
    for (const pg of pages) {
      errors.length = 0;
      await p.goto(BASE);
      await p.evaluate((cart) => { localStorage.clear(); if (cart) localStorage.setItem('sadan.cart.v1', JSON.stringify(cart)); }, pg.cart ? CART : null);
      await p.goto(BASE + pg.route);
      await p.reload();
      await p.waitForTimeout(350);
      await scrollThrough(p);
      const r = await p.evaluate(pageChecks, { touch, insets, cfgW: w });
      // buybar: scroll past actions on product pages
      if (pg.id.startsWith('product:')) {
        await p.evaluate(() => { const a = document.querySelector('.pdp__actions'); if (a) scrollTo(0, a.getBoundingClientRect().bottom + scrollY + 50); });
        await p.waitForTimeout(500);
        r.buybarVisible = await p.evaluate(() => { const b = document.querySelector('.buybar'); return !!b && getComputedStyle(b).display !== 'none' && b.classList.contains('is-visible'); });
        if (insets) { const extra = await p.evaluate(pageChecks, { touch, insets, cfgW: w }); r.unsafe.push(...extra.unsafe); }
      }
      // footer end not hidden behind the bottom bar
      await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await p.waitForTimeout(150);
      r.footerCovered = await p.evaluate(() => {
        const last = document.querySelector('.site-footer__bottom p:last-child');
        const bar = [...document.querySelectorAll('.mobile-nav, .buybar.is-visible')].find((e) => getComputedStyle(e).display !== 'none');
        if (!last || !bar) return false;
        return last.getBoundingClientRect().bottom > bar.getBoundingClientRect().top + 1;
      });
      r.errors = [...errors];
      results.push({ w, h, kind: vp.kind, page: pg.id, ...r });
    }
    await ctx.close();
  }
  await b.close();
  return results;
}

export function summarize(results, label) {
  const issues = [];
  for (const r of results) {
    const add = (type, list) => list.forEach((x) => issues.push({ w: r.w, page: r.page, type, x }));
    if (r.overflowX > 0) issues.push({ w: r.w, page: r.page, type: 'تمرير أفقي', x: r.overflowX + 'px' });
    add('خارج الشاشة', r.offscreen);
    add('نص مقصوص', r.clipped);
    add('هدف لمس < 24px', r.tinyTargets);
    add('هدف لمس < 40px (لمس)', r.smallTargets);
    add('خط < 11.5px', r.smallText);
    add('صورة مشوّهة', r.distorted);
    add('خارج المنطقة الآمنة', r.unsafe);
    add('خطأ بالصفحة', r.errors);
    if (r.h1 !== 1) issues.push({ w: r.w, page: r.page, type: 'عدد h1', x: String(r.h1) });
    if (r.dir !== 'rtl') issues.push({ w: r.w, page: r.page, type: 'اتجاه', x: r.dir });
    if (r.footerCovered) issues.push({ w: r.w, page: r.page, type: 'التذييل مغطى بالشريط السفلي', x: '' });
  }
  const byType = {};
  for (const i of issues) {
    const k = i.type + ' | ' + i.x.replace(/\s*\[.*$/, '').replace(/ \d+(\.\d)?px$/, '').replace(/ \d+×\d+$/, '');
    (byType[k] ??= new Set()).add(i.w + ':' + i.page);
  }
  console.log(`\n=== ${label}: ${results.length} page×viewport runs, ${issues.length} findings ===`);
  for (const [k, set] of Object.entries(byType)) {
    const ws = [...new Set([...set].map((s) => s.split(':')[0]))].join(',');
    const pages = [...new Set([...set].map((s) => s.split(':').slice(1).join(':')))];
    console.log(`- ${k}  ×${set.size}  widths[${ws}]  pages[${pages.slice(0, 4).join(',')}${pages.length > 4 ? '…+' + (pages.length - 4) : ''}]`);
  }
  return issues;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const quick = args.includes('--quick');
  const res = await audit(quick ? { viewports: VIEWPORTS.filter((v) => [320, 390, 768, 1366].includes(v.w)) } : {});
  const issues = summarize(res, 'Responsive audit');
  const layout = {};
  for (const r of res) {
    layout[r.w] ??= { mobileNav: new Set(), hamburger: new Set(), desktopNav: new Set(), cards: new Set(), buybar: new Set() };
    layout[r.w].mobileNav.add(r.mobileNav); layout[r.w].hamburger.add(r.hamburger); layout[r.w].desktopNav.add(r.desktopNav);
    if (r.page === 'shop') layout[r.w].cards.add(r.cardsPerRow);
    if (r.buybarVisible !== undefined) layout[r.w].buybar.add(r.buybarVisible);
  }
  console.log('\nwidth | mobileNav | hamburger | desktopNav | shop cards/row | buybar on scroll');
  for (const [w, l] of Object.entries(layout)) console.log(w, '|', [...l.mobileNav], '|', [...l.hamburger], '|', [...l.desktopNav], '|', [...l.cards], '|', [...l.buybar]);
  if (outArg) writeFileSync(outArg.slice(6), JSON.stringify({ res, issues }, null, 1));
}
