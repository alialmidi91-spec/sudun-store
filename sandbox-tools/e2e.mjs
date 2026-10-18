import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const SHOTS = process.env.SHOTS; const BASE = 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const errors = [];
async function ctx(w, h, mobile) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1, locale: 'ar-IQ' });
  const p = await c.newPage();
  p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  p.on('console', (m) => m.type() === 'error' && errors.push('console ' + m.text()));
  await p.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
  return p;
}
const routes = ['', 'shop', 'product/chiffon-classic', 'product/cotton-square', 'cart', 'about', 'contact', 'delivery', 'returns', 'faq', 'nope-404', 'product/does-not-exist'];
for (const [name, w, h, m] of [['m', 390, 844, true], ['d', 1440, 900, false]]) {
  const p = await ctx(w, h, m);
  for (const r of routes) {
    await p.goto(BASE + '#/' + r); await p.waitForTimeout(400);
    const title = await p.title(); const h1 = await p.locator('h1').first().textContent().catch(() => '—');
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log(name, '/' + r, '|', title, '|', h1?.trim(), overflow > 0 ? `| H-OVERFLOW ${overflow}px` : '');
    await p.screenshot({ path: `${SHOTS}/${name}-${r.replace(/\//g, '_') || 'home'}.png`, fullPage: true });
  }
  await p.context().close();
}
// ---- Purchase flow on mobile ----
const p = await ctx(390, 844, true);
await p.goto(BASE + '#/shop'); await p.waitForTimeout(300);
const cnt = async () => (await p.locator('.results-count').textContent())?.trim();
console.log('shop count', await cnt());
await p.fill('#shop-search', 'ساتان'); await p.waitForTimeout(500); console.log('search ساتان →', await cnt(), '| url', p.url());
await p.fill('#shop-search', 'zzzz'); await p.waitForTimeout(500); console.log('empty state:', await p.locator('.state__title').textContent());
await p.click('text=عرض كل الحجابات'); await p.waitForTimeout(300); console.log('after reset →', await cnt());
await p.click('button:has-text("تصفية")'); await p.click('.sheet label:has-text("جيرسي")'); await p.waitForTimeout(200);
console.log('jersey filter →', await cnt(), p.url()); await p.click('.sheet__foot .btn--dark');
await p.selectOption('.toolbar__sort select', 'price-asc'); await p.waitForTimeout(200);
console.log('sorted prices', await p.locator('.card .price__now').allTextContents());
// single-option product quick add (underscarf has 3 colors → goes to PDP) ; use PDP flow
await p.goto(BASE + '#/product/chiffon-classic'); await p.waitForTimeout(300);
await p.click('text=أضيفي إلى السلة'); console.log('validation:', await p.locator('.form-error').textContent());
await p.click('.size-option:has-text("قياس كبير")'); await p.click('.swatch-option[title="موكا"]');
await p.click('button[aria-label="زيادة الكمية"]'); await p.click('text=أضيفي إلى السلة'); await p.waitForTimeout(200);
console.log('toast:', await p.locator('.toast p').textContent(), '| badge', await p.locator('.cart-btn__count').textContent());
await p.goto(BASE + '#/product/satin-evening-shawl'); await p.waitForTimeout(300);
await p.click('text=اطلبي الآن'); await p.waitForTimeout(300); console.log('order-now →', p.url());
await p.screenshot({ path: `${SHOTS}/flow-cart-filled.png`, fullPage: true });
await p.locator('.cart-line').first().locator('button[aria-label="زيادة الكمية"]').click();
console.log('line totals', await p.locator('.cart-line__total').allTextContents(), '| total', await p.locator('.summary__total dd').textContent());
await p.click('text=إتمام الطلب عبر واتساب'); await p.waitForTimeout(100);
console.log('field errors:', (await p.locator('.field__error').allTextContents()).length);
await p.fill('#f-name', 'زينب علي'); await p.fill('#f-phone', '٠٧٧٠١٢٣٤٥٦٧'); await p.selectOption('#f-governorate', 'البصرة');
await p.fill('#f-area', 'العشار'); await p.fill('#f-address', 'شارع الكورنيش، قرب الجسر #2 & المحل');
await p.click('text=إتمام الطلب عبر واتساب'); await p.waitForTimeout(100);
console.log('config error:', await p.locator('.form-error').textContent());
await p.screenshot({ path: `${SHOTS}/flow-placeholder-number.png`, fullPage: false });
await p.reload(); await p.waitForTimeout(300);
console.log('cart persisted after reload:', await p.locator('.cart-line').count(), 'lines; name kept:', await p.inputValue('#f-name'));
await browser.close();
console.log('\nERRORS:', errors.length ? errors : 'none');
