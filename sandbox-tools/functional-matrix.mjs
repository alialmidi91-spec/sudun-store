// Sandbox-only: functional tests repeated at every viewport width.
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import { VIEWPORTS } from './responsive-audit.mjs';

const BASE = process.env.BASE || 'http://localhost:4173/#/';
const only = process.argv.slice(2).map(Number).filter(Boolean);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const table = [];
let totalPass = 0, totalFail = 0;

for (const vp of VIEWPORTS.filter((v) => !only.length || only.includes(v.w))) {
  const touch = vp.w <= 1024;
  const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: touch, hasTouch: touch, locale: 'ar-IQ' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
  const results = [];
  const check = async (name, fn) => {
    try { const ok = await fn(); results.push([name, ok === true ? 'ok' : 'FAIL ' + ok]); }
    catch (e) { results.push([name, 'FAIL ' + e.message.split('\n')[0].slice(0, 90)]); }
  };
  // تحميل كامل لكل خطوة حتى ما تأثر خطوة فاشلة على اللي بعدها
  const go = async (r) => {
    await p.goto(BASE + r); await p.reload();
    await p.locator('main h1').first().waitFor({ state: 'visible', timeout: 8000 });
    await p.waitForTimeout(150);
  };
  const count = async () => ((await p.locator('.results-count').textContent()) || '').trim();
  const isVis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
  const tap = (sel) => (touch ? p.locator(sel).first().tap() : p.locator(sel).first().click());
  const inView = async (sel) => p.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return !!r && r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1; }, sel);

  await go('');
  await p.evaluate(() => localStorage.clear());

  await check('القائمة الرئيسية', async () => {
    await go('');
    if (await isVis('.site-header [aria-label="فتح القائمة"]')) {
      await tap('.site-header [aria-label="فتح القائمة"]');
      await p.waitForTimeout(500); // انتظار حركة الانزلاق
      if (!(await isVis('.drawer'))) return 'الدرج ما انفتح';
      if (!(await inView('.drawer'))) { await p.keyboard.press('Escape'); return 'الدرج خارج الشاشة'; }
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      if (await isVis('.drawer')) return 'Escape ما سكّر';
      await tap('.site-header [aria-label="فتح القائمة"]');
      await tap('.drawer a:has-text("كل الحجابات")');
    } else {
      if (!(await isVis('.site-header .site-nav'))) return 'لا قائمة ظاهرة';
      await tap('.site-header .site-nav a:has-text("كل الحجابات")');
    }
    await p.waitForTimeout(250);
    return p.url().endsWith('#/shop') || p.url();
  });

  await check('البحث من الهيدر', async () => {
    await go('');
    await tap('.site-header [aria-label="البحث"]');
    await p.locator('#site-search').fill('شيفون'); await p.waitForTimeout(200);
    const n = await p.locator('.search-dialog__results li').count();
    if (n < 1) return 'لا نتائج';
    await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    return (p.url().includes('/shop?q=') && (await count()) === '1 منتج') || `${p.url()} ${await count()}`;
  });

  await check('البحث بصفحة المتجر + نتيجة فارغة', async () => {
    await go('shop');
    await p.locator('#shop-search').fill('قطن'); await p.waitForTimeout(450);
    if ((await count()) !== '1 منتج') return 'قطن: ' + (await count());
    await p.locator('#shop-search').fill('zzzz'); await p.waitForTimeout(450);
    return (await p.locator('.state__title').textContent())?.includes('ما لگينا') || 'لا رسالة فارغة';
  });

  await check('التصفية حسب الخامة', async () => {
    await go('shop');
    if (await isVis('.toolbar button:has-text("تصفية")')) {
      await tap('.toolbar button:has-text("تصفية")');
      if (!(await isVis('.sheet'))) return 'لوحة التصفية ما انفتحت';
      // مجموعة «الخامة» مطوية افتراضياً: نفتحها أولاً ونتأكد من aria-expanded
      const t = p.locator('.sheet .filters__toggle:has-text("الخامة")');
      if ((await t.getAttribute('aria-expanded')) !== 'false') return 'مجموعة الخامة لازم تكون مطوية بالبداية';
      await t.click();
      if ((await t.getAttribute('aria-expanded')) !== 'true') return 'مجموعة الخامة ما انفتحت';
      await tap('.sheet label:has-text("قطن")');
      await tap('.sheet__foot .btn--dark');
    } else {
      const t = p.locator('.shop__sidebar .filters__toggle:has-text("الخامة")');
      if ((await t.getAttribute('aria-expanded')) !== 'false') return 'مجموعة الخامة لازم تكون مطوية بالبداية';
      await t.focus(); await p.keyboard.press('Enter'); // لوحة المفاتيح
      if ((await t.getAttribute('aria-expanded')) !== 'true') return 'مجموعة الخامة ما انفتحت باللوحة';
      await tap('.shop__sidebar label:has-text("قطن")');
    }
    await p.waitForTimeout(250);
    if (!((await count()) === '1 منتج' && p.url().includes('material=cotton'))) return `${await count()} ${p.url()}`;
    // بعد إعادة التحميل: المجموعة الفعّالة تبقى مفتوحة وتعرض العدد
    await p.reload(); await p.locator('main h1').first().waitFor();
    if (await isVis('.toolbar button:has-text("تصفية")')) await tap('.toolbar button:has-text("تصفية")');
    const scope = (await isVis('.sheet')) ? '.sheet' : '.shop__sidebar';
    const t2 = p.locator(`${scope} .filters__toggle:has-text("الخامة")`);
    return ((await t2.getAttribute('aria-expanded')) === 'true' && ((await t2.locator('.filters__count').textContent()) ?? '').startsWith('1')) || 'المجموعة الفعّالة ما بقت مفتوحة';
  });

  await check('الترتيب حسب السعر', async () => {
    await go('shop?sort=price-desc');
    const prices = (await p.locator('.card .price__now').allTextContents()).map((t) => +t.replace(/[^\d]/g, ''));
    return prices.every((v, i) => !i || prices[i - 1] >= v) || prices.join(',');
  });

  await check('اختصارات الأنواع', async () => {
    await go('shop');
    await tap('.quick-cats button:has-text("العروض")'); await p.waitForTimeout(200);
    if ((await count()) !== '3 منتج') return 'العروض ' + (await count());
    await tap('.quick-cats button:has-text("الكل")'); await p.waitForTimeout(200);
    return (await count()) === '7 منتج' || 'الكل ' + (await count());
  });

  await check('الإضافة من صفحة المنتج + التنبيه', async () => {
    await go('product/ninja-shawl');
    await tap('.pdp__actions .btn--dark'); await p.waitForTimeout(250);
    if (!(await isVis('.toast'))) return 'لا تنبيه';
    if (!(await inView('.toast'))) return 'التنبيه خارج الشاشة';
    return (await p.locator('.cart-btn__count').textContent()) === '1' || 'عدد السلة';
  });

  await check('شريط الشراء الثابت (أقل من 900px فقط)', async () => {
    await go('product/ninja-shawl');
    await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; const a = document.querySelector('.pdp__actions'); scrollTo(0, a.getBoundingClientRect().bottom + scrollY + 60); });
    await p.waitForTimeout(600);
    const shown = await p.evaluate(() => { const el = document.querySelector('.buybar'); return !!el && getComputedStyle(el).display !== 'none' && el.classList.contains('is-visible') && el.getBoundingClientRect().bottom <= innerHeight + 1; });
    return shown === vp.w < 900 || `ظاهر=${shown}`;
  });

  await check('الشريط السفلي (أقل من 600px فقط)', async () => {
    await go('');
    const shown = await isVis('.mobile-nav');
    if (shown !== vp.w < 600) return `ظاهر=${shown}`;
    if (shown) { await tap('.mobile-nav a:has-text("السلة")'); await p.waitForTimeout(250); if (!p.url().endsWith('#/cart')) return p.url(); }
    return true;
  });

  await check('السلة: الكمية والحذف والمجموع', async () => {
    await go('cart');
    const line = p.locator('.cart-line').first();
    await (touch ? line.locator('button[aria-label="زيادة الكمية"]').tap() : line.locator('button[aria-label="زيادة الكمية"]').click());
    await (touch ? line.locator('button[aria-label="زيادة الكمية"]').tap() : line.locator('button[aria-label="زيادة الكمية"]').click());
    await p.waitForTimeout(150);
    const offer = await p.locator('.summary__offer').count();
    return (offer === 1 && (await line.locator('.qty__value').textContent()) === '3') || `offer=${offer}`;
  });

  await check('نموذج الطلب ورسالة واتساب', async () => {
    await go('cart');
    await tap('.checkout button[type=submit]'); await p.waitForTimeout(150);
    if ((await p.locator('.field__error').count()) !== 5) return 'أخطاء التحقق ' + (await p.locator('.field__error').count());
    await p.fill('#f-name', 'زينب'); await p.fill('#f-phone', '07701234567'); await p.selectOption('#f-governorate', 'كربلاء');
    await p.fill('#f-area', 'حي الحسين'); await p.fill('#f-address', 'شارع 20 قرب الجامع');
    await tap('.checkout button[type=submit]'); await p.waitForTimeout(300);
    const url = (await p.evaluate(() => window.__opened)).at(-1) || '';
    const msg = decodeURIComponent(url.split('?text=')[1] || '');
    return (url.startsWith('https://wa.me/9647777795064?text=') && msg.includes('المبلغ الإجمالي النهائي: 25,000 د.ع') && msg.includes('المحافظة: كربلاء')) || url.slice(0, 50);
  });

  await check('فورم التواصل → واتساب', async () => {
    await go('contact');
    await p.fill('#c-msg', 'سؤال عن الألوان');
    await tap('.contact__form button[type=submit]'); await p.waitForTimeout(200);
    const url = (await p.evaluate(() => window.__opened)).at(-1) || '';
    return decodeURIComponent(url).includes('سؤال عن الألوان') || url.slice(0, 40);
  });

  await check('الأسئلة الشائعة تنفتح وتنسد', async () => {
    await go('faq');
    const btn = p.locator('.accordion__trigger').nth(1);
    await (touch ? btn.tap() : btn.click());
    return (await btn.getAttribute('aria-expanded')) === 'true' || 'ما انفتح';
  });

  await check('صفحة 404', async () => {
    await go('nothing-here');
    return (await p.locator('h1').textContent()) === 'ضاعت الطيّة هنا' || 'h1';
  });

  await check('لا أخطاء JavaScript', async () => errors.length === 0 || errors.join(' | '));

  const pass = results.filter((r) => r[1] === 'ok').length;
  totalPass += pass; totalFail += results.length - pass;
  table.push({ w: vp.w, kind: vp.kind, pass, fail: results.length - pass, fails: results.filter((r) => r[1] !== 'ok') });
  await ctx.close();
}
await b.close();
for (const r of table) console.log(`${String(r.w).padStart(4)} ${r.kind.padEnd(12)} ✓${r.pass} ✗${r.fail}`, r.fails.length ? JSON.stringify(r.fails) : '');
console.log(`\nTOTAL: ${totalPass} passed, ${totalFail} failed`);
if (totalFail) process.exit(1);
